// Types
import type { BillingCycle, Plan, PlanCycle, StoreSubscription } from '@harness-monorepo/contracts';
import type { PlanModel, StoreSubscriptionModel } from '../../generated/prisma/models.js';

// App
import { daysLeft, lastDayBefore } from './billing-dates.js';
import { BILLING_CYCLES, CYCLE_MONTHS } from './billing.constants.js';
import { statusAt } from './subscription-status.js';

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

export type StoreSubscriptionRow = StoreSubscriptionModel & { plan: Pick<PlanModel, 'id' | 'slug' | 'name'> | null };

/**
 * A subscription as its page's owner reads it at `now`. Asaas's ids stay behind: the panel has no
 * use for them.
 */
export function toStoreSubscription(row: StoreSubscriptionRow, now: Date): StoreSubscription {
  return {
    id: row.id,
    status: statusAt(row, now),
    trialStartedAt: row.trialStartedAt.toISOString(),
    trialEndsAt: row.trialEndsAt.toISOString(),
    trialLastDay: lastDayBefore(row.trialEndsAt),
    trialDaysLeft: daysLeft(row.trialEndsAt, now),
    plan: row.plan ? { id: row.plan.id, slug: row.plan.slug, name: row.plan.name } : null,
    cycle: row.cycle,
    priceCents: row.priceCents,
    currentPeriodEndsAt: row.currentPeriodEndsAt?.toISOString() ?? null,
    cancelRequestedAt: row.cancelRequestedAt?.toISOString() ?? null,
    freePeriodEndsAt: row.freePeriodEndsAt?.toISOString() ?? null,
    paymentMethod: row.paymentMethod,
    invoiceUrl: row.invoiceUrl,
    // The two columns are set together, by the table's CHECK.
    card: row.cardBrand !== null && row.cardLast4 !== null ? { brand: row.cardBrand, last4: row.cardLast4 } : null,
  };
}
