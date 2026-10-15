/*
  What the panel's Assinar screen (BEELINK-293) hands its blocks. Restated from the contracts on
  purpose — this package declares no dependency on the wire types, so a block renders in Storybook
  with nothing behind it — and already in words where a date is concerned: the screen knows the
  calendar the page is charged on, a block does not.
*/

/** How often a plan is charged, each time for the whole cycle. Mirrors `BillingCycle`. */
export type SubscriptionCycleValue = "MONTHLY" | "SEMIANNUAL" | "ANNUAL"

/** Who bee-link charges for an account's pages. Mirrors `BillingDocumentType`. */
export type SubscriptionDocumentValue = "CPF" | "CNPJ"

/** What the money of a page's plan last moved by, as Asaas told it. Mirrors `SubscriptionPaymentMethod`. */
export type SubscriptionMethodValue = "CREDIT_CARD" | "DEBIT_CARD" | "PIX" | "BOLETO"

/** One cycle on offer: what is paid today, what that comes to a month and saves, and when it renews. */
export interface SubscriptionOfferView {
  cycle: SubscriptionCycleValue
  months: number
  /** Paid today, for the whole cycle. */
  totalCents: number
  monthlyCents: number
  /** Against paying the month for as long; zero for the month itself. */
  savingCents: number
  savingPercent: number
  /**
   * The day it renews, in words, if it were paid for today. Null for the cycle of an invoice already
   * open: that renewal counts from the invoice's due day, which the screen is not told.
   */
  renewsOn: string | null
}

/** Where the page stands, as the top of the screen says it. Every date is already in words. */
export type SubscriptionStandingView =
  | { status: "TRIALING"; lastDay: string; daysLeft: number }
  | { status: "TRIAL_EXPIRED"; lastDay: string }
  | { status: "ACTIVE"; paidUntil: string | null }
  | { status: "PAST_DUE"; endedOn: string | null }
  | { status: "SUSPENDED" }
  | { status: "CANCELED"; until: string | null }

/**
 * Why a page's panel is closed, as the locked page's notice tells its owner (BEELINK-296). Mirrors
 * `PageLockReason`, and adds `FREE_PERIOD_OVER`: a page that never paid whose free month — a coupon's,
 * or the one the pages that already existed were given — ran out. The API locks it as
 * `TRIAL_EXPIRED`; the screen tells it apart by `freePeriodEndsAt`.
 */
export type SubscriptionLockValue = "TRIAL_EXPIRED" | "SUSPENDED" | "CANCELED" | "FREE_PERIOD_OVER"

/** Who the page's plan is charged to: the document arrives masked, never whole. */
export interface SubscriptionAccountView {
  name: string
  document: string
  documentType: SubscriptionDocumentValue
}

/** A page whose paid period is running. */
export interface SubscriptionPaidView {
  cycle: SubscriptionCycleValue | null
  priceCents: number | null
  /** The last day paid for, in words. */
  paidUntil: string | null
  method: SubscriptionMethodValue | null
  card: { brand: string; last4: string } | null
  /** The renewal's invoice, for a page that pays with Pix or a boleto and whose next charge is out. */
  renewalInvoiceUrl: string | null
}

/** What the checkout form hands over: the cycle, and — only where it asked for them — who is charged. */
export interface SubscriptionCheckoutValues {
  cycle: SubscriptionCycleValue
  name: string
  document: string
}
