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
 * - `ACTIVE`: a paid period is running.
 * - `PAST_DUE`: the charge of the current period was not paid by its due day.
 * - `SUSPENDED`: stopped for want of payment, having paid before.
 * - `CANCELED`: the shopkeeper cancelled, and the period paid for is over.
 * - `EXEMPT`: owes nothing, by bee-link's own choice.
 */
export type SubscriptionStatus = "TRIALING" | "TRIAL_EXPIRED" | "ACTIVE" | "PAST_DUE" | "SUSPENDED" | "CANCELED" | "EXEMPT";

/**
 * What the page's charge was last paid with, as Asaas told it. A credit card paid at Asaas's invoice
 * is kept there and renews by itself; a Pix or a boleto is a new charge to pay at every cycle.
 */
export type SubscriptionPaymentMethod = "CREDIT_CARD" | "DEBIT_CARD" | "PIX" | "BOLETO";

/** The plan a subscription is on. */
export type SubscriptionPlan = Pick<Plan, "id" | "slug" | "name">;

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
  /** ISO-8601: the first instant the paid period is over. Null while nothing was paid. */
  currentPeriodEndsAt: string | null;
  /** ISO-8601: when the shopkeeper asked to cancel. The page goes on until `currentPeriodEndsAt`. */
  cancelRequestedAt: string | null;
  /** ISO-8601: the first instant a free period given by a coupon is over. Null with none. */
  freePeriodEndsAt: string | null;
  /** Null until Asaas tells of a payment. */
  paymentMethod: SubscriptionPaymentMethod | null;
  /** Asaas's page for the charge waiting to be paid. Null with none waiting. */
  invoiceUrl: string | null;
  /** Null unless the charge was paid with a card. */
  card: SubscriptionCard | null;
}

/** `GET /stores/:slug/subscription`, read by the page's owner. */
export interface StoreSubscriptionAnswer {
  /**
   * Whether this deployment charges and locks. False: nothing is charged and nothing locks, and the
   * panel shows no plan, no notice and no payment screen — whatever `subscription` says.
   */
  billingEnforced: boolean;
  /** Null for a page from before subscriptions existed, which has none yet. */
  subscription: StoreSubscription | null;
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
 * What the billing account's routes refuse with.
 *
 * - `BILLING_UNAVAILABLE` (503): this deployment has no Asaas account of bee-link's to charge at.
 * - `BILLING_NAME_INVALID`, `BILLING_DOCUMENT_INVALID` (400): the body; nothing was kept and Asaas was not asked.
 * - `BILLING_ACCOUNT_BUSY` (409): another save of this account is being told to Asaas; nothing was kept.
 * - `BILLING_CUSTOMER_REFUSED` (502): Asaas refused the customer. The data was kept.
 * - `BILLING_UNREACHABLE` (503): Asaas did not answer. The data was kept.
 */
export type BillingErrorCode =
  | "BILLING_UNAVAILABLE"
  | "BILLING_NAME_INVALID"
  | "BILLING_DOCUMENT_INVALID"
  | "BILLING_ACCOUNT_BUSY"
  | "BILLING_CUSTOMER_REFUSED"
  | "BILLING_UNREACHABLE";
