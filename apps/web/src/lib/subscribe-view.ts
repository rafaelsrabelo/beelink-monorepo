// Types
import type { BillingCycle, BillingErrorCode, Plan, PlanCatalog, StoreSubscription, StoreSubscriptionAnswer } from "@harness-monorepo/contracts"
import type { SubscriptionLoss } from "@harness-monorepo/ui/blocks/billing/subscription-facts"
import type { SubscriptionOfferView, SubscriptionPaidView, SubscriptionStandingView } from "@harness-monorepo/ui/lib/subscription"

// UI
import { periodFiguresOf } from "@harness-monorepo/ui/lib/plan-figures"

// App
import { brasiliaDayOf, dayInWords, lastDayBefore, renewalDayOf } from "./subscription-dates"

/**
 * The plan a page is sold — `PLAN_ON_SALE` in `apps/api/src/modules/billing/billing.constants.ts`.
 * It is the one `PUT …/subscription` charges, so it is the one whose prices the screen says.
 */
export const PLAN_ON_SALE = "beelink"

/** The Assinar screen of a page (BEELINK-293). Every link to it is built here: the plan's card and the locked page's notice lead to it. */
export function subscribePageOf(slug: string): string {
  return `/admin/${encodeURIComponent(slug)}/subscribe`
}

/** An invoice already out for a page that never paid, or whose subscription was cancelled: the cycle chosen, and what it charges. */
export interface OpenInvoice {
  cycle: BillingCycle
  priceCents: number
  invoiceUrl: string
}

/**
 * What the Assinar screen is, from where the page stands (the S3 plan's "O que cada situação pede da
 * tela"):
 *
 * - `leave`: nothing is charged here — billing switched off, a page owing nothing, or one from before
 *   subscriptions — and the screen leads back to the page's panel.
 * - `choose`: never paid, or cancelled: a cycle is chosen, perhaps carrying on with an open invoice.
 * - `active`: a paid period is running; nothing to buy.
 * - `due`: a renewal went unpaid; the invoice due is paid, never another cycle chosen.
 */
export type SubscribeView =
  | { kind: "leave" }
  | { kind: "choose"; standing: SubscriptionStandingView; openInvoice: OpenInvoice | null; loss: SubscriptionLoss | null }
  | { kind: "active"; standing: SubscriptionStandingView; paid: SubscriptionPaidView }
  | { kind: "due"; standing: SubscriptionStandingView; invoiceUrl: string | null; cycle: BillingCycle | null; priceCents: number | null }

/** The last day a period ending at `endsAt` covers, in words; null with no end, or one already past when `future` is asked. */
function lastDayInWords(endsAt: string | null, locale: string, now: Date, future = false): string | null {
  if (!endsAt || (future && new Date(endsAt).getTime() <= now.getTime())) return null
  return dayInWords(lastDayBefore(endsAt), locale)
}

function openInvoiceOf(subscription: StoreSubscription): OpenInvoice | null {
  const { invoiceUrl, cycle, priceCents } = subscription
  return invoiceUrl && cycle && priceCents !== null ? { cycle, priceCents, invoiceUrl } : null
}

export function subscribeViewOf({ billingEnforced, subscription }: StoreSubscriptionAnswer, now: Date, locale: string): SubscribeView {
  if (!billingEnforced || subscription === null || subscription.status === "EXEMPT") return { kind: "leave" }

  const lastTrialDay = dayInWords(subscription.trialLastDay, locale)
  switch (subscription.status) {
    case "TRIALING":
      return {
        kind: "choose",
        standing: { status: "TRIALING", lastDay: lastTrialDay, daysLeft: subscription.trialDaysLeft },
        openInvoice: openInvoiceOf(subscription),
        loss: { kind: "trial", daysLeft: subscription.trialDaysLeft },
      }
    case "TRIAL_EXPIRED":
      return { kind: "choose", standing: { status: "TRIAL_EXPIRED", lastDay: lastTrialDay }, openInvoice: openInvoiceOf(subscription), loss: null }
    case "CANCELED": {
      const until = lastDayInWords(subscription.currentPeriodEndsAt, locale, now, true)
      return { kind: "choose", standing: { status: "CANCELED", until }, openInvoice: openInvoiceOf(subscription), loss: until ? { kind: "canceled" } : null }
    }
    case "ACTIVE": {
      const paidUntil = lastDayInWords(subscription.currentPeriodEndsAt, locale, now)
      return {
        kind: "active",
        standing: { status: "ACTIVE", paidUntil },
        paid: {
          cycle: subscription.cycle,
          priceCents: subscription.priceCents,
          paidUntil,
          method: subscription.paymentMethod,
          card: subscription.card,
          // A credit card's renewal is charged by itself; anything else is an invoice to pay.
          renewalInvoiceUrl: subscription.paymentMethod === "CREDIT_CARD" ? null : subscription.invoiceUrl,
        },
      }
    }
    case "PAST_DUE":
    case "SUSPENDED":
      return {
        kind: "due",
        standing: subscription.status === "PAST_DUE" ? { status: "PAST_DUE", endedOn: lastDayInWords(subscription.currentPeriodEndsAt, locale, now) } : { status: "SUSPENDED" },
        invoiceUrl: subscription.invoiceUrl,
        cycle: subscription.cycle,
        priceCents: subscription.priceCents,
      }
  }
}

/**
 * The plan on sale and its cycles as the screen offers them: each one's figures worked out from the
 * catalogue — never written — and the day it renews if paid for today. The cycle of an open invoice
 * is told no day: its renewal counts from that invoice's due day, which the wire does not carry.
 * Null where the catalogue holds no plan on sale with a cycle to buy.
 */
export function offersOf(catalog: PlanCatalog, openCycle: BillingCycle | null, now: Date, locale: string): { plan: Plan; offers: SubscriptionOfferView[] } | null {
  const plan = catalog.plans.find((each) => each.slug === PLAN_ON_SALE)
  if (!plan || plan.cycles.length === 0) return null

  const today = brasiliaDayOf(now)
  // Every plan is sold by the month (the contract's word); without it, no saving is claimed.
  const monthlyCents = plan.cycles.find((cycle) => cycle.cycle === "MONTHLY")?.priceCents ?? 0
  const offers = plan.cycles.map((cycle) => ({
    cycle: cycle.cycle,
    months: cycle.months,
    totalCents: cycle.priceCents,
    ...periodFiguresOf(cycle.priceCents, cycle.months, monthlyCents),
    renewsOn: cycle.cycle === openCycle ? null : dayInWords(renewalDayOf(today, cycle.months), locale),
  }))

  return { plan, offers }
}

/**
 * The codes that say the page moved under the screen — paid, exempted, billing switched off, no
 * subscription at all — so the subscription is read again before anything is said of them.
 */
export const MOVED_CODES: ReadonlySet<string> = new Set<BillingErrorCode>(["BILLING_SUBSCRIPTION_PAID", "BILLING_PAGE_ACTIVE", "BILLING_PAGE_EXEMPT", "BILLING_NOT_ENFORCED", "BILLING_SUBSCRIPTION_MISSING"])

/** The codes a check is not asked again after by the clock: an ended session, and the API's limit of calls. */
export const CHECK_STOPPING_CODES: ReadonlySet<string> = new Set(["AUTH_UNAUTHENTICATED", "RATE_LIMITED"])

/** How long the screen asks by itself once an invoice was opened from it; after that, only on coming back to the tab or by hand. */
export const SUBSCRIPTION_WATCH_FOR_MS = 10 * 60_000

/** How long "Pagamento confirmado" stays before the screen goes on to the page's panel: long enough to be read. */
export const CONFIRMED_LINGER_MS = 4_000

/** How often to ask by the time waited: often at first, when a Pix or a card is paid, then less. */
const WATCH_PACE: ReadonlyArray<readonly [waitedUnder: number, everyMs: number]> = [
  [60_000, 10_000],
  [2 * 60_000, 15_000],
  [4 * 60_000, 30_000],
  [SUBSCRIPTION_WATCH_FOR_MS, 60_000],
]

/** The wait until the next check, by the time waited since the invoice was opened; false once the screen stops asking by itself. */
export function subscriptionCheckDelayOf(waitedMs: number): number | false {
  return WATCH_PACE.find(([waitedUnder]) => waitedMs < waitedUnder)?.[1] ?? false
}
