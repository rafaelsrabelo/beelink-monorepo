// Types
import type { BillingAccount, BillingCycle, Plan, PlanCycle, StoreSubscription } from '@harness-monorepo/contracts';
import type { BillingAccountModel, PlanModel, StoreSubscriptionModel } from '../../generated/prisma/models.js';

// App
import { maskedDocumentOf } from '../integrations/asaas/masked-document.js';
import { daysLeft, lastDayBefore } from './billing-dates.js';
import { BILLING_CYCLES, CYCLE_MONTHS } from './billing.constants.js';
import { lockOf } from './page-lock.js';
import { graceEndOf, statusAt } from './subscription-status.js';

type PlanPrices = Pick<PlanModel, 'monthlyPriceCents' | 'semiannualPriceCents' | 'annualPriceCents'>;

/** What a cycle of a plan costs, whole; null for a cycle the plan is not sold in. */
export function priceOf(plan: PlanPrices, cycle: BillingCycle): number | null {
  const prices = {
    MONTHLY: plan.monthlyPriceCents,
    SEMIANNUAL: plan.semiannualPriceCents,
    ANNUAL: plan.annualPriceCents,
  } satisfies Record<BillingCycle, number | null>;

  return prices[cycle];
}

export function toPlan(row: PlanModel): Plan {
  const cycles = BILLING_CYCLES.flatMap((cycle): PlanCycle[] => {
    const priceCents = priceOf(row, cycle);
    return priceCents === null ? [] : [{ cycle, months: CYCLE_MONTHS[cycle], priceCents }];
  });

  return { id: row.id, slug: row.slug, name: row.name, cycles };
}

/** What a read of a page's subscription takes beside its row: the plan it is on, and its coupon, once used (BEELINK-224). */
export const SUBSCRIPTION_READ = {
  plan: { select: { id: true, slug: true, name: true } },
  couponRedemption: { select: { createdAt: true } },
} as const;

export type StoreSubscriptionRow = StoreSubscriptionModel & {
  plan: Pick<PlanModel, 'id' | 'slug' | 'name'> | null;
  couponRedemption: { createdAt: Date } | null;
};

/**
 * A subscription as its page's owner reads it at `now`. Asaas's ids stay behind: the panel has no
 * use for them. `locks` is whether this deployment locks pages at all (`PageLocks.engaged`): where it
 * does not, no page is said to be locked, whatever its row says.
 */
export function toStoreSubscription(row: StoreSubscriptionRow, now: Date, locks: boolean): StoreSubscription {
  const status = statusAt(row, now);
  const free = row.freePeriodEndsAt;
  return {
    id: row.id,
    status,
    trialStartedAt: row.trialStartedAt.toISOString(),
    trialEndsAt: row.trialEndsAt.toISOString(),
    trialLastDay: lastDayBefore(row.trialEndsAt),
    trialDaysLeft: daysLeft(row.trialEndsAt, now),
    plan: row.plan ? { id: row.plan.id, slug: row.plan.slug, name: row.plan.name } : null,
    cycle: row.cycle,
    priceCents: row.priceCents,
    currentPeriodEndsAt: row.currentPeriodEndsAt?.toISOString() ?? null,
    cancelRequestedAt: row.cancelRequestedAt?.toISOString() ?? null,
    freePeriodEndsAt: free?.toISOString() ?? null,
    freePeriodLastDay: free ? lastDayBefore(free) : null,
    // A number only while a free period covers the read: the panel's "free until" is this, never the status.
    freePeriodDaysLeft: free && now.getTime() < free.getTime() ? daysLeft(free, now) : null,
    couponRedeemedAt: row.couponRedemption?.createdAt.toISOString() ?? null,
    paymentMethod: row.paymentMethod,
    invoiceUrl: row.invoiceUrl,
    // The two columns are set together, by the table's CHECK.
    card: row.cardBrand !== null && row.cardLast4 !== null ? { brand: row.cardBrand, last4: row.cardLast4 } : null,
    // As the lock counts it, written or not yet: the one date the panel's notice and the lock share.
    graceEndsAt: status === 'PAST_DUE' || status === 'SUSPENDED' ? graceEndOf(row, now).toISOString() : null,
    lock: locks ? lockOf(row, now) : null,
  };
}

/**
 * An account's billing data as its owner reads it (BEELINK-291). The document never leaves whole: a
 * panel left open on a shared machine shows whose it is, not what it is. One the mask does not know
 * the shape of is answered as nothing at all.
 */
export function toBillingAccount(row: Pick<BillingAccountModel, 'name' | 'document' | 'asaasCustomerId' | 'asaasCustomerSyncedAt'>): BillingAccount {
  return {
    name: row.name,
    document: maskedDocumentOf(row.document) ?? '',
    documentType: row.document.length === 11 ? 'CPF' : 'CNPJ',
    customerReady: row.asaasCustomerId !== null && row.asaasCustomerSyncedAt !== null,
  };
}
