/**
 * The panel's cashback as its blocks read it (BEELINK-242). They mirror the wire's shapes in
 * `packages/contracts/src/cashback.ts`; this package does not import them, so a screen hands its
 * data over and the blocks never learn where it came from.
 */

/** The rules as the form edits them: what was typed, before it is read as numbers. */
export interface CashbackSettingsFormValues {
  enabled: boolean
  /** "5" or "2,5": a percentage. */
  rate: string
  /** "NONE" never expires; "DAYS" expires after `validityDays`. */
  validity: "NONE" | "DAYS"
  validityDays: string
  /** Reais, as typed: "50,00". */
  minimum: string
  maxRedeem: string
}

/** What the form refuses, by field, in words. */
export type CashbackSettingsIssues = Partial<Record<"rate" | "validityDays" | "minimum" | "maxRedeem", string>>

/** What the shop owes in credit. Mirrors `CashbackOwed`. */
export interface CashbackOwedView {
  availableCents: number
  pendingCents: number
  expiringSoonCents: number
  expiringSoonDays: number
}

export type CashbackEntryKindValue = "EARN" | "REDEEM" | "REVERSAL" | "EXPIRE" | "ADJUST" | "FORFEIT"
export type CashbackCreditStatusValue = "PENDING" | "AVAILABLE" | "VOIDED" | "EXPIRED"

/** A line of the statement. Mirrors `CashbackEntry`. */
export interface CashbackEntryView {
  id: string
  kind: CashbackEntryKindValue
  /** Signed. */
  amountCents: number
  orderNumber: number | null
  reason: string | null
  /** ISO-8601. */
  createdAt: string
}

/** A customer's credit at the shop, and a page of its statement. Mirrors `CustomerCashback`. */
export interface CustomerCashbackView {
  balanceCents: number
  pendingCents: number
  nextExpiry: { amountCents: number; expiresAt: string } | null
  entries: readonly CashbackEntryView[]
}

/** The shopkeeper's adjustment as the form edits it. */
export interface CashbackAdjustmentFormValues {
  direction: "GIVE" | "TAKE"
  /** Reais, as typed. */
  amount: string
  reason: string
}

export type CashbackAdjustmentIssues = Partial<Record<"amount" | "reason", string>>

/** An order's cashback, as the shop reads it. Mirrors `ShopOrderCashback`. */
export interface OrderCashbackView {
  earnedCents: number
  rateBps: number
  status: CashbackCreditStatusValue
  remainingCents: number
  availableAt: string | null
  expiresAt: string | null
  unrecoveredCents: number
}
