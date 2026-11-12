// Types
import type { AuthSession } from "./auth.js";
import type { OrderStatus } from "./order.js";

/**
 * A shop's affiliate programme (IMPULSEIA-100): people who sell through the shop's link and earn a
 * commission on what they sell. The customer pays the shop's own prices; the affiliate's share is
 * worked out by bee-link and paid by the shopkeeper, outside it.
 *
 * Amounts are whole cents; rates are basis points (1000 = 10.00%), as everywhere a share is stated.
 * Days are `YYYY-MM-DD` on Brasília's calendar.
 */

/** The programme's rules, as the panel's form edits them. */
export interface AffiliateProgram {
  enabled: boolean;
  /** Days a visit through an affiliate's link credits the orders that follow it, 1 to 90. */
  attributionDays: number;
  /** Days after a payout period closes that its commissions fall due, 0 to 60. */
  payoutDelayDays: number;
  /** The shop's own terms, which an affiliate accepts on joining, up to 10000 characters; null when there are none. */
  termsText: string | null;
  /** 0 until terms are first written; up by one each time their text changes. An affiliate keeps the one they accepted. */
  termsVersion: number;
  /** ISO-8601. */
  updatedAt: string;
}

/** What `PUT /stores/:slug/affiliate-program` takes: the whole of the rules. The terms' version is the API's to move. */
export type AffiliateProgramPayload = Pick<AffiliateProgram, "enabled" | "attributionDays" | "payoutDelayDays" | "termsText">;

/**
 * One of a month's three payout periods — the 1st to the 10th, the 11th to the 20th, the 21st to the
 * month's last day. A commission falls in the period of the day its order was delivered, and is due
 * the period's last day plus the programme's delay.
 */
export interface AffiliatePayoutPeriod {
  firstDay: string;
  lastDay: string;
  dueOn: string;
}

/** A commission table as the programme lists it. */
export interface CommissionTableSummary {
  id: string;
  name: string;
  /** What every product pays on this table, 0 to 10000, unless it or its category has a rate of its own here. */
  defaultRateBps: number;
  /** The table born with the programme: the one a product's own form edits, and never deleted. */
  isDefault: boolean;
  /** How many products have a rate of their own on this table. */
  productRateCount: number;
  /** How many categories have a rate of their own on this table. */
  categoryRateCount: number;
  /** How many affiliates are on this table and not ended. A table with any is not deleted. */
  affiliateCount: number;
}

/**
 * A product's own rate on a table, which replaces its category's and the table's for that product.
 * 0 pays it nothing. A product's rate is `product ?? its category ?? the table's`, and nothing else.
 */
export interface CommissionProductRate {
  productId: string;
  rateBps: number;
}

/** A category's own rate on a table (the user's review, 12/11): every product of it pays this, unless the product has its own. */
export interface CommissionCategoryRate {
  categoryId: string;
  rateBps: number;
}

/** A commission table, whole. */
export interface CommissionTable {
  id: string;
  name: string;
  defaultRateBps: number;
  isDefault: boolean;
  /** By product: these come first. */
  rates: CommissionProductRate[];
  /** By category: for the products of it with no rate of their own. */
  categoryRates: CommissionCategoryRate[];
  /** ISO-8601. */
  updatedAt: string;
}

/** What creating or changing a table takes. The name is trimmed, 1 to 60 characters, and one per shop. */
export interface CommissionTablePayload {
  name: string;
  defaultRateBps: number;
}

/** What `PUT …/tables/:tableId/rates/:productId` takes. */
export interface CommissionProductRatePayload {
  rateBps: number;
}

/** What `PUT …/tables/:tableId/category-rates/:categoryId` takes. */
export interface CommissionCategoryRatePayload {
  rateBps: number;
}

/** `GET /stores/:slug/affiliate-program`: the rules, the tables — the default first — and the running month's periods at the saved delay. */
export interface AffiliateProgramOverview {
  program: AffiliateProgram;
  tables: CommissionTableSummary[];
  periods: AffiliatePayoutPeriod[];
  /**
   * Whether this deployment credits orders to affiliates yet (IMPULSEIA-107): off until the privacy
   * policy names the affiliates' cookie and that the buyer's name reaches them (AF9). While it is,
   * neither a link nor the panel credits an order to anyone.
   */
  linksLive: boolean;
}

/** What the programme's routes answer besides the shop's and the catalogue's own codes. */
export type AffiliateErrorCode =
  /** A rule of the programme out of its range, or missing. */
  | "AFFILIATE_PROGRAM_INVALID"
  /** A table's name or rate, or a product's rate, out of its range or missing. */
  | "COMMISSION_TABLE_INVALID"
  | "COMMISSION_TABLE_NOT_FOUND"
  /** Another table of the shop already has this name. */
  | "COMMISSION_TABLE_NAME_TAKEN"
  /** The default table is not deleted: every affiliate needs a table to fall back on. */
  | "COMMISSION_TABLE_DEFAULT"
  /** The shop already has the most tables it may keep. */
  | "COMMISSION_TABLE_LIMIT"
  /** Affiliates who have not ended are on this table: move them before deleting it. */
  | "COMMISSION_TABLE_IN_USE"
  /** An affiliate's name, e-mail, phone, CPF, note or table out of its range or missing. */
  | "AFFILIATE_INVALID"
  | "AFFILIATE_NOT_FOUND"
  /** Another affiliate of the shop, not ended, has this e-mail. */
  | "AFFILIATE_EMAIL_TAKEN"
  /** Another affiliate of the shop, not ended, has this CPF. */
  | "AFFILIATE_CPF_TAKEN"
  /** What was asked does not fit where the affiliate stands; `details` is `AffiliateStatusDetails`. */
  | "AFFILIATE_STATUS_INVALID"
  /** The invite went out less than a minute ago. */
  | "AFFILIATE_INVITE_RECENTLY_SENT"
  /** No invite answers to this link: never one, already accepted, sent again since, or cancelled. */
  | "AFFILIATE_INVITE_NOT_FOUND"
  /** The invite's seven days are over: the shop can send it again. */
  | "AFFILIATE_INVITE_EXPIRED"
  /** The signed-in account is not the one invited; `details` is `AffiliateInviteEmailMismatchDetails`. */
  | "AFFILIATE_INVITE_EMAIL_MISMATCH"
  /** The `/name` cannot be the affiliate's; `details` is `AffiliateSlugUnavailableDetails`. */
  | "AFFILIATE_SLUG_UNAVAILABLE"
  /** The acceptance's `/name`, Pix key, terms version, name or password out of its range or missing. */
  | "AFFILIATE_ACCEPTANCE_INVALID"
  /** The shop changed its terms since they were read: read the invite again. */
  | "AFFILIATE_TERMS_CHANGED"
  /** The account already sells for this shop, under another invite. */
  | "AFFILIATE_ALREADY_LINKED"
  /** No affiliate of the shop has this `/name` or id: the address is nobody's link. */
  | "AFFILIATE_LINK_NOT_FOUND"
  /** An order cannot be credited to anyone now: the programme is off, or crediting is not live in this deployment yet. */
  | "AFFILIATE_ATTRIBUTION_CLOSED"
  /** The order's commission is not pending: `details` is `AffiliateCommissionStatusDetails`. Once available, a correction is an adjustment. */
  | "AFFILIATE_COMMISSION_NOT_PENDING"
  /** A change of an order's affiliate without its reason, or with one out of range. */
  | "AFFILIATE_ORDER_CHANGE_INVALID"
  /** An adjustment of 0, out of range, or with no reason. */
  | "AFFILIATE_ADJUSTMENT_INVALID"
  /** A payout of nothing, out of range, dated in the future or with an unknown method. */
  | "AFFILIATE_PAYOUT_INVALID"
  /** A payout past what is available: `details` is `AffiliatePayoutExceedsDetails`. An advance is an adjustment. */
  | "AFFILIATE_PAYOUT_EXCEEDS_BALANCE"
  /** The affiliate's own data out of its range: a Pix key of no known shape, a phone, a photo not uploaded here, a phrase past 100. */
  | "AFFILIATE_PROFILE_INVALID";

/**
 * Where an affiliate stands with a shop (IMPULSEIA-103): invited and not yet in; selling; paused —
 * no new order is credited, those already credited run their course; or ended, for good. An ended
 * affiliate may be invited again, which starts a new standing with the shop.
 */
export type AffiliateStatus = "INVITED" | "ACTIVE" | "PAUSED" | "ENDED";

/** An affiliate as the shop's list shows them. */
export interface ShopAffiliateSummary {
  id: string;
  name: string;
  /** Lower case, as it was invited. */
  email: string;
  /** Digits only, with the country code. Required since 12/11/2026; null only for one invited before. */
  phone: string | null;
  /** The `/name` chosen on accepting, unique in the shop for good; null while invited. */
  slug: string | null;
  status: AffiliateStatus;
  table: { id: string; name: string };
  /** ISO-8601. */
  invitedAt: string;
  /** ISO-8601; null while invited. */
  acceptedAt: string | null;
}

/** One affiliate, whole, as the shop reads them. The Pix key is the shop's to see: it is the shop that pays. */
export interface ShopAffiliate extends ShopAffiliateSummary {
  /** Eleven digits, the shop's alone to see. Required since 12/11/2026; null only for one invited before. */
  cpf: string | null;
  note: string | null;
  pixKey: string | null;
  photoUrl: string | null;
  tagline: string | null;
  /** The version of the shop's terms accepted; null while invited. */
  termsVersion: number | null;
  /** ISO-8601. */
  termsAcceptedAt: string | null;
  /** ISO-8601. */
  endedAt: string | null;
  /** While invited: when the invite last went out, and when its link stops working. */
  invite: { sentAt: string; expiresAt: string } | null;
}

/** `GET /stores/:slug/affiliates`: newest invited first. */
export interface ShopAffiliatePage {
  affiliates: ShopAffiliateSummary[];
  total: number;
  page: number;
  pageSize: number;
}

/** What inviting takes. The e-mail is where the invite goes, and the one account that may accept it. */
export interface CreateAffiliatePayload {
  /** 2 to 120 characters, trimmed. */
  name: string;
  email: string;
  tableId: string;
  /** Any way a person writes it; kept as digits with the country code. */
  phone: string;
  /** With or without points and dash; kept as its eleven digits, and checked. */
  cpf: string;
  /** The shop's own, up to 500 characters; the affiliate never reads it. */
  note?: string | null;
}

/** A patch: a key left out is left alone. The phone and the CPF are completed or corrected, never cleared. */
export interface UpdateAffiliatePayload {
  tableId?: string;
  phone?: string;
  cpf?: string;
  note?: string | null;
}

/** `details` of `AFFILIATE_STATUS_INVALID`. */
export interface AffiliateStatusDetails {
  status: AffiliateStatus;
}

/** `details` of `AFFILIATE_INVITE_EMAIL_MISMATCH`: whom the invite is for. */
export interface AffiliateInviteEmailMismatchDetails {
  email: string;
}

/**
 * Why a `/name` cannot be the affiliate's: `INVALID`, not 3 to 40 of `a-z`, `0-9` and inner hyphens
 * once normalised; `RESERVED`, a word the shop's own addresses use; `TAKEN`, a category of the shop —
 * now or before a rename — or another of its affiliates.
 */
export type AffiliateSlugUnavailableReason = "INVALID" | "RESERVED" | "TAKEN";

/** `details` of `AFFILIATE_SLUG_UNAVAILABLE`. */
export interface AffiliateSlugUnavailableDetails {
  reason: AffiliateSlugUnavailableReason;
}

/** `GET /affiliate-invites/:token/slug?slug=`: the `/name` as it would be kept, and whether it can be. */
export interface AffiliateSlugAvailability {
  slug: string;
  available: boolean;
  reason: AffiliateSlugUnavailableReason | null;
}

/** A product with a rate of its own on the invite's table. */
export interface AffiliateInvitationProduct {
  productId: string;
  name: string;
  rateBps: number;
}

/** A category with a rate of its own on the invite's table: its products pay it, unless they have their own. */
export interface AffiliateInvitationCategory {
  categoryId: string;
  name: string;
  rateBps: number;
}

/** `GET /affiliate-invites/:token`: the invite as the person invited reads it, before accepting. */
export interface AffiliateInvitation {
  store: { name: string; slug: string; logoUrl: string | null };
  affiliate: { name: string; email: string };
  /** Every product pays `products`' rate if it is there, else its category's in `categories`, else `defaultRateBps`. */
  table: { name: string; defaultRateBps: number; categories: AffiliateInvitationCategory[]; products: AffiliateInvitationProduct[] };
  /** The shop's terms as they stand; `version` is what accepting sends back. */
  terms: { text: string | null; version: number };
  /** ISO-8601. */
  expiresAt: string;
  /** Whether the e-mail invited has a bee-link account: sign in and accept, rather than sign up. */
  hasAccount: boolean;
  /** A `/name` free now, from the affiliate's name; null when none is. */
  suggestedSlug: string | null;
}

/** What accepting takes, signed in. */
export interface AffiliateAcceptancePayload {
  /** Normalised as the availability check shows it. */
  slug: string;
  /** Up to 140 characters; null to give it later. */
  pixKey: string | null;
  /** The `terms.version` the invite showed. */
  termsVersion: number;
}

/** What accepting takes with no account yet: the account is made with the invited e-mail, already verified. */
export interface AffiliateSignUpPayload extends AffiliateAcceptancePayload {
  /** 2 to 120 characters. */
  name: string;
  /** 8 to 128 characters. */
  password: string;
}

/** An accepted invite: the shop the affiliate now sells for, and their `/name` there. */
export interface AcceptedAffiliate {
  storeName: string;
  storeSlug: string;
  slug: string;
}

/** `POST /affiliate-invites/:token/sign-up`: the new account's session, and the invite accepted. */
export interface AffiliateSignUpResult {
  session: AuthSession;
  affiliate: AcceptedAffiliate;
}

/**
 * An affiliate as the shop window shows them (IMPULSEIA-105): whom the visitor came by, and how long
 * the shop credits that visit. Nothing else of them is public.
 */
export interface PublicAffiliate {
  id: string;
  slug: string;
  name: string;
  photoUrl: string | null;
  /** Their own phrase, up to 100 characters; null with none. */
  tagline: string | null;
  /** Days this shop credits the orders that follow a visit through the link. */
  attributionDays: number;
}

/**
 * `GET /stores/:slug/affiliate-link?slug=` (or `?id=`): the address is an affiliate's of this shop.
 * `affiliate` is null when it credits nobody — paused, ended, the programme off, or links not yet
 * live in this deployment — and then the shop simply opens: a printed link never leads to nothing.
 */
export interface PublicAffiliateLink {
  affiliate: PublicAffiliate | null;
}

/** `POST /stores/:slug/affiliate-visits`: one visit through an affiliate's link, and nothing of the visitor. */
export interface AffiliateVisitInput {
  affiliateId: string;
}

/**
 * The visit an order was placed after (IMPULSEIA-106), as the web's order handler reads it from the
 * shop window's cookie — never from the page. The API checks it again at the order: an affiliate of
 * the shop, active, the programme on, links live and the visit inside the programme's days. One that
 * does not hold credits nobody, and never refuses the order: a value that is not one — an id that is
 * no id, an instant in the future or past ninety days — is taken in as null, and credits nobody.
 */
export interface OrderAffiliateVisitInput {
  affiliateId: string | null;
  /** ISO-8601: when the visitor followed the link. */
  visitedAt: string | null;
}

/**
 * Where an order's commission stands (IMPULSEIA-106): waiting on the delivery and then on its due
 * day (`PENDING`); owed by the shop from that day (`AVAILABLE`); or undone by a cancellation, for
 * good (`REVERSED`). An order that leaves *delivered* waits again.
 */
export type AffiliateCommissionStatus = "PENDING" | "AVAILABLE" | "REVERSED";

/** Why an attributed order's commission is nothing: the affiliate bought it themselves. */
export type AffiliateCommissionZeroReason = "OWN_PURCHASE";

/**
 * What a line of an affiliate's statement records. `RELEASED`, a commission falling due; `REVERSED`,
 * one taken back after it had — its order cancelled or out of *delivered*; `ADJUSTED`, the shop's
 * correction, either way, with its reason; `PAID_OUT`, a payment the shop made outside bee-link.
 */
export type AffiliateEntryKind = "RELEASED" | "REVERSED" | "ADJUSTED" | "PAID_OUT";

/* ── the shop's money (IMPULSEIA-107) ─────────────────────────────────────────── */

/** `details` of `AFFILIATE_COMMISSION_NOT_PENDING`. */
export interface AffiliateCommissionStatusDetails {
  status: AffiliateCommissionStatus;
}

/** `details` of `AFFILIATE_PAYOUT_EXCEEDS_BALANCE`: what can be paid now. */
export interface AffiliatePayoutExceedsDetails {
  availableCents: number;
}

/** An order's commission, as the shop reads it. */
export interface OrderAffiliateCommission {
  status: AffiliateCommissionStatus;
  /** What the customer paid for the products, never the delivery. */
  baseCents: number;
  commissionCents: number;
  /** The affiliate's table as it was named when the commission was worked out. */
  tableName: string;
  zeroReason: AffiliateCommissionZeroReason | null;
  /** `YYYY-MM-DD`: the day it falls due; null until delivered. */
  dueOn: string | null;
  /** ISO-8601: when it fell due; null while pending. */
  availableAt: string | null;
}

/** Whom an order was credited to, before or after a change: their id, if they still exist, and their name then. */
export interface OrderAffiliateParty {
  id: string | null;
  name: string;
}

/** One change of whom an order is credited to, by the shopkeeper. */
export interface OrderAffiliateChange {
  /** Null when the order was credited to nobody before. */
  from: OrderAffiliateParty | null;
  /** Null when it was taken off its affiliate. */
  to: OrderAffiliateParty | null;
  reason: string;
  /** ISO-8601. */
  at: string;
}

/**
 * `GET /stores/:slug/orders/:number/affiliate`: whom the order is credited to, its commission, and
 * every change the shopkeeper made of it, oldest first.
 */
export interface OrderAffiliate {
  /** Null when the order is credited to nobody. */
  affiliate: { id: string; name: string; slug: string | null; status: AffiliateStatus } | null;
  commission: OrderAffiliateCommission | null;
  changes: OrderAffiliateChange[];
  /** Money given back on the order (BEELINK-208): the commission did not change by itself, and the shop may adjust it. */
  refundedCents: number;
  /** Whether whom it is credited to may change: the order not cancelled, and its commission — if any — pending. */
  changeable: boolean;
}

/** `PUT /stores/:slug/orders/:number/affiliate`: credit it to another affiliate — or, with null, to nobody — and why. */
export interface OrderAffiliatePayload {
  affiliateId: string | null;
  /** 3 to 200 characters, trimmed. */
  reason: string;
}

/** How a payout made outside bee-link went. */
export type AffiliatePayoutMethod = "PIX" | "TRANSFER" | "CASH";

/** A payout as its line on the statement shows it. */
export interface AffiliatePayoutSummary {
  /** `YYYY-MM-DD`: the day the shop paid. */
  paidOn: string;
  method: AffiliatePayoutMethod;
  note: string | null;
}

/** One line of an affiliate's statement, as the shop reads it. */
export interface AffiliateStatementEntry {
  id: string;
  kind: AffiliateEntryKind;
  /** Signed, never 0. */
  amountCents: number;
  /** The order whose commission it moved; null for the shop's own lines. */
  orderNumber: number | null;
  /** The shop's words, on an adjustment. */
  reason: string | null;
  /** On a `PAID_OUT`. */
  payout: AffiliatePayoutSummary | null;
  /** ISO-8601. */
  createdAt: string;
}

/** `GET /stores/:slug/affiliates/:id/statement`: the balances and a page of the statement, newest first. */
export interface AffiliateStatement {
  /** What waits on a delivery or a due day. */
  pendingCents: number;
  /** What the statement adds up to: owed now, or — below zero — what the next payment is short by. */
  availableCents: number;
  entries: AffiliateStatementEntry[];
  total: number;
  page: number;
  pageSize: number;
}

/** `POST /stores/:slug/affiliates/:id/adjustments`. */
export interface AffiliateAdjustmentPayload {
  /** Cents, signed and never 0, up to R$ 1.000.000,00 either way. */
  amountCents: number;
  /** 3 to 200 characters, trimmed: why, in the shopkeeper's words. The affiliate reads it too. */
  reason: string;
}

/** `POST /stores/:slug/affiliates/:id/payouts`: a payment made outside bee-link, recorded. */
export interface AffiliatePayoutPayload {
  /** 1 or more, and no more than what is available. */
  amountCents: number;
  /** `YYYY-MM-DD`, not in the future. */
  paidOn: string;
  method: AffiliatePayoutMethod;
  /** Up to 200 characters; null for none. */
  note: string | null;
}

/** Whether a due day of what is owed has passed, is today, or is still to come. */
export type AffiliateOwedDayState = "OVERDUE" | "TODAY" | "UPCOMING";

/** What falls or fell due on one day, across the shop's affiliates. */
export interface AffiliateOwedDay {
  /** `YYYY-MM-DD`. */
  dueOn: string;
  amountCents: number;
  affiliateCount: number;
  state: AffiliateOwedDayState;
}

/** One affiliate's part of what the shop owes. */
export interface AffiliateOwedRow {
  affiliate: { id: string; name: string; slug: string | null; status: AffiliateStatus; pixKey: string | null };
  /** May be below zero: what the next payment is short by. */
  availableCents: number;
  pendingCents: number;
  /** `YYYY-MM-DD`: the earliest due day of what is still owed; null when nothing is, or only what has no due day. */
  oldestDueOn: string | null;
  overdue: boolean;
}

/**
 * `GET /stores/:slug/affiliate-program/owed`: what the shop owes its affiliates, by due day. A payout
 * settles what fell due first, so what is still owed is the most recent of it.
 */
export interface AffiliateOwed {
  /** `YYYY-MM-DD`, in Brasília. */
  today: string;
  /** What the shop owes now: the positive balances added up. */
  owedCents: number;
  /** Owed, by the day it fell due — overdue or today — oldest first. */
  due: AffiliateOwedDay[];
  /** Owed past every commission — an adjustment in the affiliate's favour — with no due day. */
  undatedCents: number;
  /** Delivered and waiting for their day, soonest first. */
  upcoming: AffiliateOwedDay[];
  /** Waiting on a delivery: no due day yet. */
  awaitingDeliveryCents: number;
  /** Every affiliate with something owed, pending or short, the most owed first. */
  affiliates: AffiliateOwedRow[];
}

/* ── the affiliate's own area (IMPULSEIA-108) ─────────────────────────────────── */

/**
 * One shop an account sells for, as `/afiliado` lists it: the standing the area reads there — the
 * live one, or the latest ended — and what the shop owes on it.
 */
export interface AffiliateShop {
  store: { slug: string; name: string; logoUrl: string | null };
  /** Their `/name` at the shop. */
  slug: string;
  status: Exclude<AffiliateStatus, "INVITED">;
  /** May be below zero: what the next payment is short by. */
  availableCents: number;
  pendingCents: number;
}

/** What the affiliate keeps of themselves at one shop: how the shop pays them, and what its window shows. */
export interface AffiliateProfile {
  /** Normalised: an e-mail, a random key, `+55…`, or a CPF's or a CNPJ's digits. */
  pixKey: string | null;
  /** Digits only, with the country code. */
  phone: string | null;
  /** Their CPF as the shop registered it, masked — `***.456.789-**` — and read-only: only the shop changes it. Null when the shop has none. */
  maskedCpf: string | null;
  photoUrl: string | null;
  /** Up to 100 characters. */
  tagline: string | null;
}

/** A patch of the affiliate's own data: a key left out is left alone, null clears it. An ended affiliate changes only the Pix key and the phone. */
export interface AffiliateProfilePayload {
  pixKey?: string | null;
  phone?: string | null;
  /** An address the uploads route answered. */
  photoUrl?: string | null;
  tagline?: string | null;
}

/** The affiliate's numbers over the last `days` days, today included, on Brasília's calendar. */
export interface AffiliateNumbers {
  days: number;
  /** Visits through their link. */
  visits: number;
  /** Orders credited to them, placed in the period, cancelled ones left out. */
  orders: number;
  /** Of those, the ones delivered. */
  sales: number;
  /** The commissions of those orders, the reversed left out. */
  commissionCents: number;
}

/** What the shop will pay next. */
export interface AffiliateNextPayment {
  /** Owed now — the balance, when above zero — which the shop pays outside bee-link. */
  availableCents: number;
  /** The nearest due day among the commissions still waiting for theirs, and what falls due that day; null when none has a day yet. */
  next: { dueOn: string; amountCents: number } | null;
}

/** `GET /affiliate/stores/:storeSlug`: the affiliate's front page at one shop. */
export interface AffiliateHome {
  store: { slug: string; name: string; logoUrl: string | null };
  affiliate: {
    id: string;
    name: string;
    slug: string;
    status: Exclude<AffiliateStatus, "INVITED">;
    /** Their table, as its rate stands: products may pay their own on it. */
    table: { name: string; defaultRateBps: number };
  };
  /** Whether their links credit anyone now: active, the programme on, and links live in this deployment. */
  linksCredit: boolean;
  /** The path of their link, `/<loja>/<nome>`: the site's origin goes in front. Null once ended. */
  linkPath: string | null;
  pendingCents: number;
  availableCents: number;
  payment: AffiliateNextPayment;
  numbers: AffiliateNumbers;
  profile: AffiliateProfile;
}

/** A product with the link that credits the affiliate, and what it pays them. */
export interface AffiliateProductLink {
  productId: string;
  name: string;
  imageUrl: string | null;
  priceCents: number;
  /** The product's own on their table, else its category's there, else the table's. */
  rateBps: number;
  /** `/<loja>/<produtos>/<slug>?afiliado=<nome>`: the site's origin goes in front. */
  path: string;
}

/** `GET /affiliate/stores/:storeSlug/products?q=&page=`: the shop's products on the shelf, by name. */
export interface AffiliateProductPage {
  products: AffiliateProductLink[];
  total: number;
  page: number;
  pageSize: number;
}

/** An order credited to the affiliate, as they read it: who bought, by name alone — never how to reach them. */
export interface AffiliateOrder {
  number: number;
  /** ISO-8601. */
  placedAt: string;
  status: OrderStatus;
  customerName: string;
  items: { name: string; variantLabel: string | null; quantity: number }[];
  commission: {
    status: AffiliateCommissionStatus;
    baseCents: number;
    commissionCents: number;
    zeroReason: AffiliateCommissionZeroReason | null;
    /** `YYYY-MM-DD`; null until delivered. */
    dueOn: string | null;
  };
}

/** `GET /affiliate/stores/:storeSlug/orders?page=`: newest first. */
export interface AffiliateOrderPage {
  orders: AffiliateOrder[];
  total: number;
  page: number;
  pageSize: number;
}

/** A payment the shop registered, as the affiliate reads it. */
export interface AffiliateReceivedPayout {
  id: string;
  amountCents: number;
  /** `YYYY-MM-DD`. */
  paidOn: string;
  method: AffiliatePayoutMethod;
  note: string | null;
}

/** `GET /affiliate/stores/:storeSlug/payouts?page=`: newest paid first. */
export interface AffiliatePayoutPage {
  payouts: AffiliateReceivedPayout[];
  total: number;
  page: number;
  pageSize: number;
}
