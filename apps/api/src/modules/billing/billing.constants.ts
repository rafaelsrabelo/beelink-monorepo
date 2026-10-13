// Types
import type { BillingCycle, BillingCycleMonths, SubscriptionPaymentMethod, SubscriptionStatus } from '@harness-monorepo/contracts';
import type {
  BillingCycle as BillingCycleRow,
  SubscriptionPaymentMethod as SubscriptionPaymentMethodRow,
  SubscriptionStatus as SubscriptionStatusRow,
} from '../../generated/prisma/enums.js';

/**
 * The days a new page is used before anything is owed (BEELINK-218). The landing states the same
 * number from its own copy, `trialDays` in apps/web/src/lib/plans.ts, until the web reads it from
 * `GET /billing/plans` (BEELINK-293): the two change together.
 */
export const TRIAL_DAYS = 7;

/*
  Each closed set below is written once and held to two unions at the same time: the wire's, in
  packages/contracts, and the database's, in the generated client. A word added to either alone
  stops compiling here, which is the only place the two meet.
*/

/** How many months each cycle pays for, shortest first — the order a plan's cycles are listed in. */
export const CYCLE_MONTHS = {
  MONTHLY: 1,
  SEMIANNUAL: 6,
  ANNUAL: 12,
} as const satisfies Record<BillingCycle, BillingCycleMonths> satisfies Record<BillingCycleRow, BillingCycleMonths>;

export const BILLING_CYCLES = Object.keys(CYCLE_MONTHS) as BillingCycle[];

export const SUBSCRIPTION_STATUSES = Object.keys({
  TRIALING: true,
  TRIAL_EXPIRED: true,
  ACTIVE: true,
  PAST_DUE: true,
  SUSPENDED: true,
  CANCELED: true,
  EXEMPT: true,
} satisfies Record<SubscriptionStatus, true> satisfies Record<SubscriptionStatusRow, true>) as SubscriptionStatus[];

export const SUBSCRIPTION_PAYMENT_METHODS = Object.keys({
  CREDIT_CARD: true,
  DEBIT_CARD: true,
  PIX: true,
  BOLETO: true,
} satisfies Record<SubscriptionPaymentMethod, true> satisfies Record<SubscriptionPaymentMethodRow, true>) as SubscriptionPaymentMethod[];
