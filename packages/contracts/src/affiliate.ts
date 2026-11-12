// Types
import type { AuthSession } from "./auth.js";

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
  /** What every product pays on this table, 0 to 10000, unless it has a rate of its own here. */
  defaultRateBps: number;
  /** The table born with the programme: the one a product's own form edits, and never deleted. */
  isDefault: boolean;
  /** How many products have a rate of their own on this table. */
  productRateCount: number;
  /** How many affiliates are on this table and not ended. A table with any is not deleted. */
  affiliateCount: number;
}

/** A product's own rate on a table, which replaces the table's for that product. 0 pays it nothing. */
export interface CommissionProductRate {
  productId: string;
  rateBps: number;
}

/** A commission table, whole. */
export interface CommissionTable {
  id: string;
  name: string;
  defaultRateBps: number;
  isDefault: boolean;
  rates: CommissionProductRate[];
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

/** `GET /stores/:slug/affiliate-program`: the rules, the tables — the default first — and the running month's periods at the saved delay. */
export interface AffiliateProgramOverview {
  program: AffiliateProgram;
  tables: CommissionTableSummary[];
  periods: AffiliatePayoutPeriod[];
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
  /** An affiliate's name, e-mail, phone, note or table out of its range or missing. */
  | "AFFILIATE_INVALID"
  | "AFFILIATE_NOT_FOUND"
  /** Another affiliate of the shop, not ended, has this e-mail. */
  | "AFFILIATE_EMAIL_TAKEN"
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
  | "AFFILIATE_LINK_NOT_FOUND";

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
  /** Digits only, with the country code; null when none was given. */
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
  /** Any way a person writes it; null or absent for none. */
  phone?: string | null;
  /** The shop's own, up to 500 characters; the affiliate never reads it. */
  note?: string | null;
}

/** A patch: a key left out is left alone. */
export interface UpdateAffiliatePayload {
  tableId?: string;
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

/** A product with a rate of its own on the invite's table. Every other product pays the table's rate. */
export interface AffiliateInvitationProduct {
  productId: string;
  name: string;
  rateBps: number;
}

/** `GET /affiliate-invites/:token`: the invite as the person invited reads it, before accepting. */
export interface AffiliateInvitation {
  store: { name: string; slug: string; logoUrl: string | null };
  affiliate: { name: string; email: string };
  table: { name: string; defaultRateBps: number; products: AffiliateInvitationProduct[] };
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
