// Locales
import { format } from "@harness-monorepo/ui/locales/index"

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

/** A shop's cashback as its shop window reads it. Mirrors `PublicCashback`. */
export interface ShopCashbackRule {
  rateBps: number
  minSubtotalCents: number
}

/**
 * What a price earns at a shop's rule, rounded down to the cent as the API rounds an order's
 * (BEELINK-243). Null when the price is under the shop's minimum — an order of that product alone
 * earns nothing — and when the share is under a cent.
 */
export function earnedOnPrice(priceCents: number, rule: ShopCashbackRule): number | null {
  if (priceCents < rule.minSubtotalCents) return null
  const earned = Math.floor((priceCents * rule.rateBps) / 10_000)
  return earned > 0 ? earned : null
}

/** An order's cashback as its customer reads it. Mirrors `OrderCashback`. */
export interface CustomerOrderCashbackView {
  earnedCents: number
  status: CashbackCreditStatusValue
  remainingCents: number
  expiresAt: string | null
}

/**
 * An order's cashback in one sentence for its customer (BEELINK-243): what they will earn once it is
 * delivered, what they can spend and until when, that nothing is left of it, that it expired, or that
 * it was taken back.
 *
 * In this order: taken back, then nothing left — a lot spent to the last cent stays so, and is never
 * swept, so it must not turn "expired" once its day passes — then expired, read from the date before
 * the API's sweep marks it, then pending and usable.
 */
export function customerCashbackLineOf(
  cashback: CustomerOrderCashbackView | null,
  { money, date, now, text }: { money: (cents: number) => string; date: (iso: string) => string; now: Date; text: { PENDING: string; AVAILABLE: string; AVAILABLE_UNTIL: string; SPENT: string; VOIDED: string; EXPIRED: string } },
): string | null {
  if (!cashback) return null
  if (cashback.status === "VOIDED") return text.VOIDED
  if (cashback.remainingCents === 0) return text.SPENT
  if (cashback.status === "EXPIRED" || (cashback.status === "AVAILABLE" && cashback.expiresAt !== null && new Date(cashback.expiresAt) <= now)) return text.EXPIRED
  const amount = money(cashback.remainingCents)
  if (cashback.status === "PENDING") return format(text.PENDING, { amount })
  return cashback.expiresAt ? format(text.AVAILABLE_UNTIL, { amount, date: date(cashback.expiresAt) }) : format(text.AVAILABLE, { amount })
}

/** A rate in basis points as the reader's percentage: 500 is "5%", 250 is "2,5%" in pt-BR. */
export function ratePercentOf(rateBps: number, locale: string): string {
  return new Intl.NumberFormat(locale, { style: "percent", maximumFractionDigits: 2 }).format(rateBps / 10_000)
}
