/**
 * The panel's affiliate programme as its blocks read it (IMPULSEIA-102). They mirror the wire's
 * shapes in `packages/contracts/src/affiliate.ts`; this package does not import them, so a screen
 * hands its data over and the blocks never learn where it came from.
 */

/** The programme's rules as the form edits them: what was typed, before it is read as numbers. */
export interface AffiliateSettingsFormValues {
  enabled: boolean
  /** Whole days, as typed. */
  attributionDays: string
  payoutDelayDays: string
  /** Blank is no terms. */
  termsText: string
}

/** What the form refuses, by field, in words. */
export type AffiliateSettingsIssues = Partial<Record<"attributionDays" | "payoutDelayDays" | "termsText", string>>

/** One payout period of the month, its days and its due day already in words. */
export interface AffiliatePayoutRowView {
  from: string
  to: string
  due: string
}

/** A commission table as the list shows it. Mirrors `CommissionTableSummary`. */
export interface CommissionTableView {
  id: string
  name: string
  defaultRateBps: number
  isDefault: boolean
  productRateCount: number
  /** Affiliates on it who have not ended: a table with any is not deleted. */
  affiliateCount: number
}

/** A table's name and rate as the dialog edits them. */
export interface CommissionTableFormValues {
  name: string
  /** "10" or "12,5": a percentage. */
  rate: string
}

export type CommissionTableIssues = Partial<Record<"name" | "rate", string>>

/** A product as a table's rates list it: its own rate there, or null when it follows the table's. */
export interface CommissionRateRowView {
  productId: string
  name: string
  imageUrl: string | null
  rateBps: number | null
  /** What its field shows: what was typed, or its own rate as saved. */
  typed: string
  /** What was typed is not what is saved: its save is offered. */
  changed: boolean
}
