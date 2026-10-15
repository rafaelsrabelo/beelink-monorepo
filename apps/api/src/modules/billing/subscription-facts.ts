// Types
import type { BillingCycle, SubscriptionPaymentMethod, SubscriptionStatus } from '@harness-monorepo/contracts';

// App
import { brasiliaDayOf, closeOfBrasiliaDay, renewalDayOf } from './billing-dates.js';
import { CHECK_STEPS, CYCLE_MONTHS, cycleOfAsaas, SUBSCRIPTION_PAYMENT_METHODS } from './billing.constants.js';
import type { PlatformCard, PlatformCharge, PlatformSubscription } from './platform-asaas.client.js';
import { awaitsPayment } from './subscription-attempt.js';

/*
  What Asaas's word on a page's subscription comes to for the page (BEELINK-221): its standing, the
  end of what it paid for, how it paid, the invoice waiting, and when to look again. Nothing here asks
  Asaas anything, and nothing here is written: `SubscriptionSync` reads, and writes what this answers.

  Only money Asaas says it holds makes a period, and only money that moved makes a page that never paid
  leave its trial. Every other word of Asaas's — a charge in risk analysis, one it adds later — proves
  nothing either way.
*/

/** Asaas holds the money. */
const PAID = new Set(['CONFIRMED', 'RECEIVED', 'RECEIVED_IN_CASH', 'DUNNING_RECEIVED']);
/** The money is going back, or went: a refund asked and not yet authorized leaves the charge `RECEIVED`, and paid. */
const GIVEN_BACK = new Set(['REFUNDED', 'REFUND_REQUESTED', 'REFUND_IN_PROGRESS']);
/** The payer's bank contests the money: not paid while it does. */
const DISPUTED = new Set(['CHARGEBACK_REQUESTED', 'CHARGEBACK_DISPUTE', 'AWAITING_CHARGEBACK_REVERSAL']);
/** A subscription that ended at Asaas without being removed. A word Asaas adds later ends nothing. */
const ENDED = new Set(['INACTIVE', 'EXPIRED']);
/** Standings a page reaches only by paying: a subscription gone from under one cancels it. */
const PAYING = new Set<SubscriptionStatus>(['ACTIVE', 'PAST_DUE', 'SUSPENDED']);
/** The width of `cardBrand`: a longer word is not kept, rather than fail the whole write. */
const CARD_BRAND_MAX = 20;
const HOUR_MS = 3_600_000;

const isPaid = (charge: Pick<PlatformCharge, 'status'>): boolean => PAID.has(charge.status);
const moneyMoved = (charge: Pick<PlatformCharge, 'status'>): boolean => PAID.has(charge.status) || GIVEN_BACK.has(charge.status) || DISPUTED.has(charge.status);
const methodOf = (word: string): SubscriptionPaymentMethod | null => SUBSCRIPTION_PAYMENT_METHODS.find((method) => method === word) ?? null;

/** The page's row as a read of Asaas finds it, under its lock. */
export interface PageStanding {
  status: SubscriptionStatus;
  cycle: BillingCycle | null;
  /** A day of Brasília's calendar, as the DATE column hands it over: the UTC midnight that carries its name. */
  firstDueDate: Date | null;
  currentPeriodEndsAt: Date | null;
  paymentMethod: SubscriptionPaymentMethod | null;
  cardBrand: string | null;
  cardLast4: string | null;
}

/** What the page's row is to say once Asaas was read. */
export interface PageFacts {
  status: SubscriptionStatus;
  currentPeriodEndsAt: Date | null;
  paymentMethod: SubscriptionPaymentMethod | null;
  cardBrand: string | null;
  cardLast4: string | null;
  invoiceUrl: string | null;
  nextCheckAt: Date | null;
  /** The subscription is no more at Asaas: removed, ended, or never there. */
  gone: boolean;
  /** The charge of today's period went back while the subscription stands: Asaas charges again unless it is removed there. */
  givenBackStanding: boolean;
}

/** A subscription that cannot be put on a calendar: the row has no cycle and Asaas names none bee-link knows. */
export class SubscriptionWithoutCalendar extends Error {}

/**
 * The last day a charge due on `due` pays for: the due day of the calendar's next charge after it —
 * the day the charge after it may still be paid on. Counted from the first charge, as Asaas counts: a
 * charge paid late gains nothing, and one whose due day was moved by hand pays until the next day the
 * calendar has.
 */
export function coveredUntilDay(firstDueDay: string, cycle: BillingCycle, due: string): string {
  const months = (Number(due.slice(0, 4)) - Number(firstDueDay.slice(0, 4))) * 12 + (Number(due.slice(5, 7)) - Number(firstDueDay.slice(5, 7)));
  // A renewal at or before `due`, so the walk forward is a step or two, however old the subscription.
  let renewal = Math.max(0, Math.floor(months / CYCLE_MONTHS[cycle]) - 1);
  for (;;) {
    const day = renewalDayOf(firstDueDay, cycle, renewal);
    if (day > due) return day;
    renewal += 1;
  }
}

/** The earliest of these by due day; null with none. */
function earliest(charges: PlatformCharge[]): PlatformCharge | null {
  let found: PlatformCharge | null = null;
  for (const charge of charges) if (!found || charge.dueDate < found.dueDate) found = charge;
  return found;
}

/** A card as the row can keep it, or none: brand and last four digits only, the brand within its column. */
const keptCard = (card: PlatformCard | null): PlatformCard | null => (card && card.brand.length <= CARD_BRAND_MAX ? card : null);

/**
 * What the page's row is to say of its subscription, from what Asaas holds now — the subscription the
 * row names (null when Asaas has none such) and its charges — and what the row said before.
 *
 * - **Exempt** is bee-link's choice, and nothing Asaas says moves it.
 * - **Gone** at Asaas — removed, ended, or none: `CANCELED` for a page that paid, with what it paid
 *   for still used until `currentPeriodEndsAt`; a page that never paid stays as it was — there is
 *   nothing to cancel, and its trial is not cut short.
 * - **A paid charge covers today:** `ACTIVE`.
 * - **The charge of today's period went back:** `CANCELED`.
 * - **Nothing on this subscription says money moved:** as it was. The first charge waits, and the
 *   page goes on in trial or with its trial expired.
 * - **It paid before, and the period ended unpaid:** `PAST_DUE` — but `SUSPENDED`, which is the lock's
 *   to write, and `CANCELED`, which only a payment ends, stay.
 */
export function factsOf(row: PageStanding, subscription: PlatformSubscription | null, charges: PlatformCharge[], now: Date): PageFacts {
  const today = brasiliaDayOf(now);
  const dated = charges.filter((charge) => charge.dueDate !== '');
  const cycle = row.cycle ?? (subscription ? cycleOfAsaas(subscription.cycle) : null);
  // The first due day as the choice wrote it; else the earliest charge's, as the choice reads it.
  const firstDueDay = row.firstDueDate ? row.firstDueDate.toISOString().slice(0, 10) : (earliest(dated)?.dueDate ?? null);
  const moneySeen = dated.some(moneyMoved);
  if (dated.length > 0 && (!cycle || !firstDueDay)) throw new SubscriptionWithoutCalendar("A page's subscription has no cycle to count its periods by");
  // Only ever called with a charge in hand, which the line above made sure has a calendar.
  const until = (due: string): string => coveredUntilDay(firstDueDay!, cycle!, due);

  const gone = subscription === null || subscription.deleted || ENDED.has(subscription.status);

  // The run of paid periods today falls in — or the last one before today — joined while each next
  // charge is paid by the day the one before it ends.
  let end: string | null = null;
  for (const due of [...new Set(dated.filter(isPaid).map((charge) => charge.dueDate))].sort()) {
    if (end === null || due > end) {
      if (due > today) break;
      end = until(due);
    } else if (until(due) > end) end = until(due);
  }
  const paidThrough = end === null ? null : closeOfBrasiliaDay(end);
  const covered = paidThrough !== null && now < paidThrough;
  // A list that shows no money at all erases nothing of what was known: a removed subscription's charges, were Asaas to stop listing them.
  const currentPeriodEndsAt = moneySeen ? paidThrough : row.currentPeriodEndsAt;

  let latest: PlatformCharge | null = null;
  for (const charge of dated) if (charge.dueDate <= today && (!latest || charge.dueDate > latest.dueDate)) latest = charge;
  const givenBack = latest !== null && GIVEN_BACK.has(latest.status);
  const paying = moneySeen || PAYING.has(row.status);

  const status = statusOf(row.status, { gone, covered, givenBack, paying, moneySeen });

  // How the money last moved, and the card only when it moved by one.
  const moved = dated.filter(moneyMoved).sort((a, b) => b.dueDate.localeCompare(a.dueDate));
  const telling = moved.find((charge) => methodOf(charge.billingType) !== null) ?? null;
  const paymentMethod = telling ? methodOf(telling.billingType) : row.paymentMethod;
  const byCard = paymentMethod === 'CREDIT_CARD' || paymentMethod === 'DEBIT_CARD';
  const card = telling ? (byCard ? keptCard(telling.card ?? subscription?.card ?? null) : null) : row.cardBrand && row.cardLast4 ? { brand: row.cardBrand, last4: row.cardLast4 } : null;

  // The charge waiting whose period is not over: paying an older one covers nothing of today.
  const open = gone ? null : earliest(dated.filter((charge) => awaitsPayment(charge) && charge.invoiceUrl !== null && until(charge.dueDate) >= today));

  return {
    status,
    currentPeriodEndsAt,
    paymentMethod,
    cardBrand: card?.brand ?? null,
    cardLast4: card?.last4 ?? null,
    invoiceUrl: open?.invoiceUrl ?? null,
    nextCheckAt: nextCheckOf({ status, gone, covered, paidThrough, waitingSince: open?.dueDate ?? null }, now),
    gone,
    givenBackStanding: givenBack && !gone,
  };
}

function statusOf(was: SubscriptionStatus, read: { gone: boolean; covered: boolean; givenBack: boolean; paying: boolean; moneySeen: boolean }): SubscriptionStatus {
  if (was === 'EXEMPT') return was;
  if (read.gone) return read.paying ? 'CANCELED' : was;
  if (read.covered) return 'ACTIVE';
  if (read.givenBack) return 'CANCELED';
  if (!read.moneySeen) return was;
  if (was === 'SUSPENDED' || was === 'CANCELED') return was;
  return 'PAST_DUE';
}

/**
 * When the routine is to read the page again: never for one exempt or whose subscription is gone —
 * nothing more happens at Asaas, and an event or a choice brings it back; for one active, at noon of
 * the last day it covers (a card is charged on that day) and just after its end, which is when it
 * would turn past due; for one waiting on a charge or in arrears, further and further apart as the
 * wait grows. The webhook is how a payment is meant to be learned of: this is for the one it lost.
 */
export function nextCheckOf(read: { status: SubscriptionStatus; gone: boolean; covered: boolean; paidThrough: Date | null; waitingSince: string | null }, now: Date): Date | null {
  if (read.status === 'EXEMPT' || read.gone) return null;
  if (read.covered && read.paidThrough) {
    const end = read.paidThrough.getTime();
    const noon = end - 12 * HOUR_MS;
    if (now.getTime() < noon) return new Date(noon);
    return new Date(Math.max(end, now.getTime()) + 60_000);
  }

  // Since the day the charge waiting fell due — the midnight in Brasília that opens it — else since the paid period ended.
  const since = read.waitingSince ? closeOfBrasiliaDay(read.waitingSince).getTime() - 24 * HOUR_MS : (read.paidThrough?.getTime() ?? now.getTime());
  const waited = Math.max(0, now.getTime() - since);
  const step = CHECK_STEPS.find(([within]) => waited < within)?.[1] ?? CHECK_STEPS[CHECK_STEPS.length - 1]![1];
  return new Date(now.getTime() + step);
}
