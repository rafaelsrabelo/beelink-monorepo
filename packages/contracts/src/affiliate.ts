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
  | "COMMISSION_TABLE_LIMIT";
