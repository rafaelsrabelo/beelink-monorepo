/**
 * What a page owes bee-link (BEELINK-218): the plans, and each page's subscription. A page is a
 * store, and the plan is per page: each has its own trial, its own subscription and its own lock, and
 * an account with two pages has two of each.
 *
 * This is bee-link charging the shopkeeper, at bee-link's own Asaas account. It never meets the money
 * of a shop's sales, which is charged at the shop's own account (`payment.ts`, `asaas.ts`).
 *
 * Amounts are whole cents.
 */

/** How often a plan is charged. Each cycle is one charge for the whole of it, not one a month. */
export type BillingCycle = "MONTHLY" | "SEMIANNUAL" | "ANNUAL";

/** How many months a cycle pays for: `MONTHLY` 1, `SEMIANNUAL` 6, `ANNUAL` 12. */
export type BillingCycleMonths = 1 | 6 | 12;

/** One cycle a plan is sold in. */
export interface PlanCycle {
  cycle: BillingCycle;
  months: BillingCycleMonths;
  /** What the whole cycle costs, not a month of it: 32340 for six months is 5390 a month. */
  priceCents: number;
}

/** A plan on sale. */
export interface Plan {
  id: string;
  /** The plan's stable name in code: `beelink`, `beelink-beelia`. */
  slug: string;
  name: string;
  /** Only the cycles it is sold in, shortest first. Never empty: every plan is sold by the month. */
  cycles: PlanCycle[];
}

/** `GET /billing/plans`, read by anyone: what a page costs, and how long it is tried for free. */
export interface PlanCatalog {
  /** The days a new page is used before anything is owed. */
  trialDays: number;
  /** The plans on sale, cheapest by the month first. A plan switched off is not listed. */
  plans: Plan[];
}

/**
 * Where a page stands with bee-link.
 *
 * - `TRIALING`: inside its free trial; nothing exists at Asaas.
 * - `TRIAL_EXPIRED`: the trial ended and the page never paid.
 * - `ACTIVE`: a paid period is running — a charge Asaas holds as paid covers today.
 * - `PAST_DUE`: it paid before, and the period paid for ended with the next charge unpaid. A page
 *   read `ACTIVE` past `currentPeriodEndsAt` reads this, whether or not anything wrote it yet. It is
 *   used as ever through a grace of seven days (BEELINK-223).
 * - `SUSPENDED`: stopped for want of payment, having paid before — a page past due whose grace ended
 *   reads this, whether or not anything wrote it yet. Locked until it pays.
 * - `CANCELED`: its subscription ended — removed at Asaas, or the charge of the period given back —
 *   having paid before. What was paid is still used until `currentPeriodEndsAt`, when that is ahead.
 * - `EXEMPT`: owes nothing, by bee-link's own choice; nothing Asaas says moves it.
 *
 * Only a payment moves a page out of its trial: a subscription chosen and never paid — even one
 * removed at Asaas — leaves the page as it was.
 */
export type SubscriptionStatus = "TRIALING" | "TRIAL_EXPIRED" | "ACTIVE" | "PAST_DUE" | "SUSPENDED" | "CANCELED" | "EXEMPT";

/**
 * What the page's charge was last paid with, as Asaas told it. A credit card paid at Asaas's invoice
 * is kept there and renews by itself; a Pix or a boleto is a new charge to pay at every cycle.
 */
export type SubscriptionPaymentMethod = "CREDIT_CARD" | "DEBIT_CARD" | "PIX" | "BOLETO";

/** The plan a subscription is on. */
export type SubscriptionPlan = Pick<Plan, "id" | "slug" | "name">;

/**
 * Why a page is locked (BEELINK-223), where bee-link charges and the page can pay. A locked page's
 * panel answers nothing but its own subscription, and its shop window sells nothing.
 *
 * - `TRIAL_EXPIRED`: the trial ended and the page never paid.
 * - `SUSPENDED`: it paid before, and the grace after its period's end went by unpaid.
 * - `CANCELED`: its subscription ended, and what it paid for is over — or there was none left.
 *
 * Never locked: an exempt page, one inside a free period given by a coupon, one in trial, one paid
 * for, one past due inside its grace, one cancelled whose paid period still runs.
 */
export type PageLockReason = "TRIAL_EXPIRED" | "SUSPENDED" | "CANCELED";

/** `details` of `PAGE_LOCKED`, which only the page's owner is ever answered. */
export interface PageLockedDetails {
  reason: PageLockReason;
}

/**
 * The response header the shop's public read carries where pages lock (BEELINK-223): the instant,
 * ISO-8601, after which the answer may no longer be true by the clock alone — for an open page, the
 * next instant its lock could close (a trial, a paid period, a free period or a grace ending); for a
 * locked one, a minute after it was read, since only a payment, which no clock knows, opens it.
 * Whoever keeps the answer asks again once it has passed, as with `PricesChangeAtHeader`. Absent where
 * nothing locks.
 */
export type LockChangesAtHeader = "x-lock-changes-at";

/** All that is kept of a card: never its number, its holder, its validity or a token of it. */
export interface SubscriptionCard {
  /** In Asaas's word: `VISA`, `MASTERCARD`… */
  brand: string;
  last4: string;
}

/** A page's subscription, as its owner reads it. */
export interface StoreSubscription {
  id: string;
  /** As it stands at the instant of the read: a trial past its end reads `TRIAL_EXPIRED`. */
  status: SubscriptionStatus;
  /** ISO-8601: when the page was created. */
  trialStartedAt: string;
  /** ISO-8601: the first instant the trial is over, a midnight in Brasília. */
  trialEndsAt: string;
  /** `YYYY-MM-DD`, on Brasília's calendar: the last day the trial covers. */
  trialLastDay: string;
  /** Days of Brasília's calendar until `trialLastDay`: 0 on that day and after it. */
  trialDaysLeft: number;
  /** Null until the shopkeeper chooses one; with `cycle` and `priceCents`, all three or none. */
  plan: SubscriptionPlan | null;
  cycle: BillingCycle | null;
  /** What the cycle costs this page, as agreed when it was chosen: the plan's price may change after. */
  priceCents: number | null;
  /**
   * ISO-8601: the first instant the paid period is over — the midnight in Brasília closing the due day
   * of the charge after the last one paid, by Asaas's calendar. Null while nothing was paid, and after
   * the only payment was given back.
   */
  currentPeriodEndsAt: string | null;
  /** ISO-8601: when the shopkeeper asked to cancel. The page goes on until `currentPeriodEndsAt`. */
  cancelRequestedAt: string | null;
  /** ISO-8601: the first instant a free period given by a coupon is over. Null with none. */
  freePeriodEndsAt: string | null;
  /** What the money last moved by, as Asaas told it. Null until Asaas tells of a payment. */
  paymentMethod: SubscriptionPaymentMethod | null;
  /**
   * Asaas's page for the charge waiting to be paid whose period is not over: the first charge while it
   * is unpaid, then each renewal once Asaas makes it — which a card on file is charged by itself.
   * Null with none waiting.
   */
  invoiceUrl: string | null;
  /** Null unless the charge was paid with a card. */
  card: SubscriptionCard | null;
  /**
   * ISO-8601: the first instant a page past due is locked (BEELINK-223) — seven days after its paid
   * period ended or, with no period to count from, after the day it was found past due. The date the
   * lock, the panel's notice and the e-mails all read. Null unless the page is past due or suspended.
   */
  graceEndsAt: string | null;
  /**
   * Why the page is locked at the instant of the read, or null while it is open (BEELINK-223). Always
   * null where nothing locks: `billingEnforced` false, or no Asaas account of bee-link's to pay at.
   */
  lock: PageLockReason | null;
}

/**
 * `GET /stores/:slug/subscription`, read by the page's owner — and `POST /stores/:slug/subscription/check`,
 * which asks Asaas first (BEELINK-221).
 */
export interface StoreSubscriptionAnswer {
  /**
   * Whether this deployment charges and locks. False: nothing is charged and nothing locks, and the
   * panel shows no plan, no notice and no payment screen — whatever `subscription` says.
   */
  billingEnforced: boolean;
  /** Null for a page from before subscriptions existed, which has none yet. */
  subscription: StoreSubscription | null;
}

/**
 * `PUT /stores/:slug/subscription`: the cycle the page's plan is to be paid in (BEELINK-292). The plan
 * is the one on sale, and what it costs is the plan's own price for that cycle: neither is sent.
 */
export interface SubscriptionChoicePayload {
  cycle: BillingCycle;
}

/**
 * What that answers: the page's subscription made at bee-link's Asaas account, with no card asked,
 * and where its first charge is paid. The same choice again answers the same invoice; another cycle,
 * while nothing was paid, answers another. The page's `status` is not changed by choosing: it changes
 * when the charge is paid.
 */
export interface SubscriptionChoice {
  /** Asaas's own page for the charge: a card, Pix or a boleto, chosen there. Always `https`. */
  invoiceUrl: string;
  /** The page's subscription as it now reads: the plan, the cycle and the price chosen, and the same invoice. */
  subscription: StoreSubscription;
}

/** Which document a billing account is charged under. */
export type BillingDocumentType = "CPF" | "CNPJ";

/**
 * `PUT /billing/account`: who bee-link charges for an account's pages (BEELINK-291). The e-mail is the
 * account's own and is not sent; a phone and an address are not asked.
 */
export interface BillingAccountPayload {
  /** A person's name or a company's, 2 to 120 characters once trimmed. */
  name: string;
  /** A CPF or a CNPJ, with its punctuation or without; its check digits are verified. */
  document: string;
}

/** An account's billing data, as its owner reads it. One per account, whatever the number of pages. */
export interface BillingAccount {
  name: string;
  /** Never whole: `***.456.789-**` for a CPF, `**.345.678/0001-**` for a CNPJ. */
  document: string;
  documentType: BillingDocumentType;
  /**
   * Whether bee-link's Asaas account holds this account as a customer, with this name and document.
   * False after a save Asaas refused or did not answer: the data was kept, and saving again tries again.
   */
  customerReady: boolean;
}

/** `GET /billing/account`. */
export interface BillingAccountAnswer {
  /** Null for an account that never gave its billing data. */
  account: BillingAccount | null;
}

/**
 * What the billing routes refuse with.
 *
 * The account's (`/billing/account`) and the page's choice of a cycle (`PUT /stores/:slug/subscription`):
 *
 * - `BILLING_UNAVAILABLE` (503): this deployment has no Asaas account of bee-link's to charge at.
 * - `BILLING_NAME_INVALID`, `BILLING_DOCUMENT_INVALID` (400): the body; nothing was kept and Asaas was not asked.
 * - `BILLING_ACCOUNT_BUSY` (409): another save of this account is being told to Asaas; nothing was kept.
 * - `BILLING_CUSTOMER_REFUSED` (502): Asaas refused the customer. The data was kept.
 * - `BILLING_UNREACHABLE` (503): Asaas did not answer. What was kept stays kept, and asking again picks it up.
 *   Also what `POST /stores/:slug/subscription/check` answers when Asaas could not be asked (BEELINK-221).
 *
 * The page's choice of a cycle alone (BEELINK-292) — all but the last two before Asaas is asked anything:
 *
 * - `BILLING_CYCLE_INVALID` (400): the body names no cycle a plan is charged in.
 * - `BILLING_NOT_ENFORCED` (409): this deployment charges nothing, so nothing is bought in it.
 * - `BILLING_ACCOUNT_REQUIRED` (409): the account never gave who is charged; `PUT /billing/account` first.
 * - `BILLING_SUBSCRIPTION_MISSING` (409): a page from before subscriptions existed, which has none yet.
 * - `BILLING_PAGE_EXEMPT` (409): the page owes nothing, by bee-link's own choice.
 * - `BILLING_PAGE_ACTIVE` (409): a period already paid for is running.
 * - `BILLING_PLAN_UNAVAILABLE` (409): the plan is not on sale, or not in that cycle.
 * - `BILLING_SUBSCRIPTION_BUSY` (409): another choice for this page is being told to Asaas; ask again in a moment.
 * - `BILLING_SUBSCRIPTION_PAID` (409): Asaas says the subscription the page has was paid; nothing was made or removed.
 *   The payment was read before this answer (BEELINK-221): the subscription read again shows it.
 * - `BILLING_SUBSCRIPTION_REFUSED` (502): Asaas refused the subscription. Nothing was made.
 *
 * bee-link's own Asaas webhook (BEELINK-221), answered to Asaas and to nobody else:
 *
 * - `BILLING_WEBHOOK_TOKEN_INVALID` (401): the request does not carry the platform webhook's token; nothing was kept.
 */
export type BillingErrorCode =
  | "BILLING_UNAVAILABLE"
  | "BILLING_NAME_INVALID"
  | "BILLING_DOCUMENT_INVALID"
  | "BILLING_ACCOUNT_BUSY"
  | "BILLING_CUSTOMER_REFUSED"
  | "BILLING_UNREACHABLE"
  | "BILLING_CYCLE_INVALID"
  | "BILLING_NOT_ENFORCED"
  | "BILLING_ACCOUNT_REQUIRED"
  | "BILLING_SUBSCRIPTION_MISSING"
  | "BILLING_PAGE_EXEMPT"
  | "BILLING_PAGE_ACTIVE"
  | "BILLING_PLAN_UNAVAILABLE"
  | "BILLING_SUBSCRIPTION_BUSY"
  | "BILLING_SUBSCRIPTION_PAID"
  | "BILLING_SUBSCRIPTION_REFUSED"
  | "BILLING_WEBHOOK_TOKEN_INVALID";
