// Types
import type { BillingCycle } from '@harness-monorepo/contracts';

// App
import { ASAAS_CYCLES } from './billing.constants.js';
import type { PlatformCharge, PlatformSubscription } from './platform-asaas.client.js';

/*
  What stands at Asaas for a page, read (BEELINK-292): whether a subscription found there is the one
  the page is asking for, and whether anything of it was paid. Nothing here asks Asaas anything.
*/

/** What a page's choice asks of Asaas: the plan's price for the cycle as the database held it, charged to the account's customer. */
export interface WantedSubscription {
  /** `cus_…`: the account's customer as Asaas holds it now. */
  customerId: string;
  cycle: BillingCycle;
  priceCents: number;
}

/** The two ways a charge is still only waiting: not yet due, and past its due day unpaid. */
const WAITING = new Set(['PENDING', 'OVERDUE']);

export const awaitsPayment = (charge: Pick<PlatformCharge, 'status'>): boolean => WAITING.has(charge.status);

/**
 * Whether money moved over any of a subscription's charges, or may have: paid, received, given back,
 * disputed, under Asaas's analysis — and a word Asaas adds later, which is not known to be harmless.
 * Such a subscription is never removed here and never has another made beside it.
 */
export const touchedByMoney = (charges: Pick<PlatformCharge, 'status'>[]): boolean => charges.some((charge) => !awaitsPayment(charge));

/**
 * A subscription's first charge: the one due earliest, which is where a page that never paid pays.
 * The subscription itself cannot say that day — its `nextDueDate` is already the charge after.
 */
export function firstChargeOf<Charge extends Pick<PlatformCharge, 'dueDate'>>(charges: Charge[]): Charge | null {
  let first: Charge | null = null;
  for (const charge of charges) {
    if (!charge.dueDate) continue;
    if (!first || charge.dueDate < first.dueDate) first = charge;
  }
  return first;
}

/**
 * Whether a subscription standing at Asaas is the one asked for: alive, the account's customer's, in
 * the cycle chosen and at what the plan costs now. One made at a price the plan no longer has does not
 * serve — what a page is charged is the price of the day it chooses.
 */
export function serves(subscription: PlatformSubscription, want: WantedSubscription): boolean {
  return (
    !subscription.deleted &&
    subscription.status === 'ACTIVE' &&
    subscription.customerId === want.customerId &&
    subscription.cycle === ASAAS_CYCLES[want.cycle] &&
    subscription.valueCents === want.priceCents
  );
}

const CYCLE_WORDS = {
  MONTHLY: 'mensal',
  SEMIANNUAL: 'semestral',
  ANNUAL: 'anual',
} satisfies Record<BillingCycle, string>;

/** Longer than any name a shop was seen to have, and far inside what Asaas takes for a description. */
const STORE_NAME_MAX = 120;

/** What the shopkeeper reads on Asaas's invoice, in their own language: the plan, the cycle and which page it pays for. */
export function invoiceDescriptionOf(planName: string, cycle: BillingCycle, storeName: string): string {
  const page = [...storeName.trim()].slice(0, STORE_NAME_MAX).join('');
  return `Plano ${planName} ${CYCLE_WORDS[cycle]} — página "${page}"`;
}
