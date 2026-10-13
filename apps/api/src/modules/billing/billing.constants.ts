// Types
import type { BillingCycle, BillingCycleMonths, BillingDocumentType, BillingErrorCode, SubscriptionPaymentMethod, SubscriptionStatus } from '@harness-monorepo/contracts';
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

export const BILLING_DOCUMENT_TYPES = Object.keys({ CPF: true, CNPJ: true } satisfies Record<BillingDocumentType, true>) as BillingDocumentType[];

/** A name's bounds, in characters as Postgres counts them: the column's width, and no single letter. */
export const BILLING_NAME_MIN_LENGTH = 2;
export const BILLING_NAME_MAX_LENGTH = 120;

/**
 * How long one save holds the talk with Asaas about an account's customer (BEELINK-291): past every
 * call it may make — the search, then a change or a creation — at the client's ten seconds each.
 */
export const CUSTOMER_CLAIM_MS = 60_000;

/** How long nobody creates after a creation Asaas left unanswered: time for a customer it did make to show in the search. */
export const CUSTOMER_UNKNOWN_HOLD_MS = 45_000;

/**
 * bee-link's name for an account at its own Asaas account: how its customer is found again. Prefixed,
 * because that Asaas account may hold customers that are not bee-link's shopkeepers — another
 * product's, or a shop's own, which are filed under their record's bare id. Lower case: Asaas's
 * search ignores case, and the comparison made here does not.
 */
export const customerReferenceOf = (userId: string): string => `beelink-account-${userId.toLowerCase()}`;

export function billingError(errorCode: BillingErrorCode, message: string) {
  return { errorCode, message };
}
