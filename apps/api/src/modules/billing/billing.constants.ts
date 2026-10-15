// Types
import type { BillingCycle, BillingCycleMonths, BillingDocumentType, BillingErrorCode, LockChangesAtHeader, PageLockReason, SubscriptionPaymentMethod, SubscriptionStatus } from '@harness-monorepo/contracts';
import type {
  BillingCycle as BillingCycleRow,
  SubscriptionPaymentMethod as SubscriptionPaymentMethodRow,
  SubscriptionStatus as SubscriptionStatusRow,
} from '../../generated/prisma/enums.js';

/**
 * The days a new page is used before anything is owed (BEELINK-218). The landing states the same
 * number from its own copy, `trialDays` in apps/web/src/lib/plans.ts, which it keeps on purpose
 * (BEELINK-293): the two change together, and `web/landing-prices-match-api` in scripts/arch-gates.sh
 * refuses a commit where they do not.
 */
export const TRIAL_DAYS = 7;

/**
 * The days a page past due is used as ever before it locks (BEELINK-223), counted from the end of its
 * paid period — itself the midnight in Brasília closing the due day — so the grace ends at a midnight
 * too. Enough for a card Asaas charges late, and for a boleto to clear.
 */
export const GRACE_DAYS = 7;

/**
 * How long the shop's public read of a locked page may be kept before it is asked for again
 * (BEELINK-223): only a payment opens the page, and no clock knows when one comes. As long as the web
 * keeps any answer: shorter, every visit to a locked shop would cost a call to a limit all the shops'
 * windows share.
 */
export const LOCKED_ANSWER_MS = 60_000;

/** Where the shop's public read says when what it says of the lock may stop holding by the clock alone (BEELINK-223). */
export const LOCK_CHANGES_AT_HEADER = 'x-lock-changes-at' satisfies LockChangesAtHeader;

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

/** Each cycle in Asaas's own word (BEELINK-292): translated here and nowhere else, on the way out and to tell one of its subscriptions by. */
export const ASAAS_CYCLES = {
  MONTHLY: 'MONTHLY',
  SEMIANNUAL: 'SEMIANNUALLY',
  ANNUAL: 'YEARLY',
} as const satisfies Record<BillingCycle, string>;

/** A cycle from Asaas's word for it; null for a word bee-link does not sell in. */
export function cycleOfAsaas(word: string): BillingCycle | null {
  return BILLING_CYCLES.find((cycle) => ASAAS_CYCLES[cycle] === word) ?? null;
}

/** The plan a page is sold, by its slug. Its row, its switch and what each cycle costs are the seed's: no price is written in code. */
export const PLAN_ON_SALE = 'beelink';

/**
 * The day whose pages were given a free month counted from it (BEELINK-297): a page created before
 * this day was over in Brasília is free until the same day a month later is over —
 * `freeMonthEndOf(PAGES_EXISTED_ON)` — whatever the day charging is switched on. The migration
 * `20261015170000_pages_that_existed` wrote it once, with both instants as literals: SQL imports nothing.
 */
export const PAGES_EXISTED_ON = '2026-10-13';

/**
 * A coupon of bee-link's as it is typed (BEELINK-224): the shape a shop's coupon has (`COUPON_CODE`,
 * modules/promotions), so a shopkeeper types one as the other — A–Z, 0–9, `-` and `_`, 3 to 30 of them,
 * any case. Its own copy and not an import: what a shop's coupon may be is the shop's rule, and the
 * database holds this one by a CHECK.
 */
export const PLATFORM_COUPON_CODE = /^[A-Za-z0-9][A-Za-z0-9_-]{2,29}$/;

/** The most pages a coupon may be made for — the ceiling a shop's coupon has. */
export const PLATFORM_COUPON_MAX_USES_MAX = 1_000_000;

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

export const PAGE_LOCK_REASONS = Object.keys({ TRIAL_EXPIRED: true, SUSPENDED: true, CANCELED: true } satisfies Record<PageLockReason, true>) as PageLockReason[];

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

/**
 * How long one choice of a cycle holds the talk with Asaas about a page's subscription (BEELINK-292).
 * Pushed ahead again before each call that changes something there, so it need only outlast the reads
 * between two of them, at the client's ten seconds each.
 */
export const SUBSCRIPTION_CLAIM_MS = 90_000;

/** How long nobody creates after a creation Asaas left unanswered: time for a subscription it did make to show in the search. */
export const SUBSCRIPTION_UNKNOWN_HOLD_MS = 45_000;

/**
 * bee-link's name for a page's subscription at its own Asaas account: how what was made there is found
 * again, and told from whatever else the account holds. Of the row's own id and not the store's.
 * Prefixed and lower case, for the reasons the customer's reference is.
 */
export const subscriptionReferenceOf = (subscriptionId: string): string => `beelink-subscription-${subscriptionId.toLowerCase()}`;

export function billingError(errorCode: BillingErrorCode, message: string) {
  return { errorCode, message };
}

/*
  How a page comes to know it was paid (BEELINK-221): bee-link's own webhook, the routine behind it,
  and the panel asking now.
*/

const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

/**
 * How long the routine leaves a page waiting on a charge, by how long it has waited: often at first,
 * when a payment is likeliest, then less and less. The account's quota — 25,000 requests in twelve
 * hours — is one for every shopkeeper, and the webhook is the way a payment is meant to be heard of.
 */
export const CHECK_STEPS: readonly (readonly [waitedUnder: number, step: number])[] = [
  [HOUR_MS, 10 * MINUTE_MS],
  [DAY_MS, HOUR_MS],
  [7 * DAY_MS, 6 * HOUR_MS],
  [Number.POSITIVE_INFINITY, DAY_MS],
];

/** How far the routine pushes a page's next look before it asks Asaas: one that fails is not asked again at every pass. */
export const CHECK_PUSH_MS = 10 * MINUTE_MS;
/** The first look after a subscription is made or kept by a choice: the shopkeeper is on the invoice. */
export const CHECK_FIRST_MS = 10 * MINUTE_MS;
/** Pages read per pass of the routine, the longest due first. */
export const CHECKS_PER_PASS = 20;
/** The panel's own "has it been paid?" asks Asaas once in this long for a page; inside it, the row is the answer. */
export const CHECK_AGAIN_MS = 10_000;
/** Between passes of the routine. */
export const BILLING_ROUTINE_MS = MINUTE_MS;

/** Events claimed per sweep. */
export const BILLING_EVENT_BATCH = 10;
/** How many times an event is tried before it is given up: the last waits two hours, some four hours in all. Losing one loses no payment — the routine reads the page anyway. */
export const BILLING_EVENT_ATTEMPTS_MAX = 8;
/** How long a claimed event is one sweep's: longer than a whole batch may take, each event two requests at the client's ten seconds a call. */
export const BILLING_EVENT_LEASE_MS = 5 * MINUTE_MS;
/** How long a done event is kept to tell a second delivery by: Asaas holds an undelivered one fourteen days. */
export const BILLING_EVENT_KEEP_MS = 30 * DAY_MS;

/** When an event that failed its `attempts`-th try is due again: after 1, 2, 4, 8… minutes — the shops' own events' rhythm. */
export function billingEventRetryAtOf(attempts: number, now = Date.now()): Date {
  return new Date(now + MINUTE_MS * 2 ** (Math.max(attempts, 1) - 1));
}

/** Between two looks at bee-link's own webhook at Asaas, and after one that failed. */
export const WEBHOOK_LOOK_EVERY_MS = DAY_MS;
export const WEBHOOK_LOOK_RETRY_MS = HOUR_MS;

/** The web's route that hands bee-link's own Asaas events to the API: the same path on both. */
export const PLATFORM_WEBHOOK_PATH = '/api/billing/asaas/webhook';

/** How the webhook is named at Asaas's panel, where the shops' are `bee-link (<slug>)`. */
export const PLATFORM_WEBHOOK_NAME = 'bee-link (assinaturas)';

/**
 * What bee-link's own webhook asks Asaas to send: every event that says a charge's money moved, that a
 * charge was made, changed or removed — a renewal's invoice comes with its creation — and that a
 * subscription changed or ended. Accepted, every one, by the sandbox on 14/10/2026. None is applied by
 * what its body says: each makes bee-link read the page's subscription.
 */
export const PLATFORM_WEBHOOK_EVENTS = [
  'PAYMENT_CREATED',
  'PAYMENT_UPDATED',
  'PAYMENT_AUTHORIZED',
  'PAYMENT_AWAITING_RISK_ANALYSIS',
  'PAYMENT_APPROVED_BY_RISK_ANALYSIS',
  'PAYMENT_REPROVED_BY_RISK_ANALYSIS',
  'PAYMENT_CREDIT_CARD_CAPTURE_REFUSED',
  'PAYMENT_CONFIRMED',
  'PAYMENT_RECEIVED',
  'PAYMENT_RECEIVED_IN_CASH_UNDONE',
  'PAYMENT_OVERDUE',
  'PAYMENT_DELETED',
  'PAYMENT_RESTORED',
  'PAYMENT_REFUNDED',
  'PAYMENT_PARTIALLY_REFUNDED',
  'PAYMENT_REFUND_IN_PROGRESS',
  'PAYMENT_REFUND_DENIED',
  'PAYMENT_CHARGEBACK_REQUESTED',
  'PAYMENT_CHARGEBACK_DISPUTE',
  'PAYMENT_AWAITING_CHARGEBACK_REVERSAL',
  'PAYMENT_DUNNING_RECEIVED',
  'SUBSCRIPTION_CREATED',
  'SUBSCRIPTION_UPDATED',
  'SUBSCRIPTION_INACTIVATED',
  'SUBSCRIPTION_DELETED',
] as const;
