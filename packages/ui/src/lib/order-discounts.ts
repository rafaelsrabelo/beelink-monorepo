// Locales
import { format } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

/** Mirrors the wire's `CouponKind`; this package imports no contracts. */
export type CouponKindValue = "PERCENT" | "FIXED" | "FREE_SHIPPING"

/**
 * What was taken off an order — or would be, off a cart being priced — as the wire tells it: the
 * whole discount and its two named parts. What is left of the whole is what the shopkeeper typed.
 */
export interface DiscountParts {
  discountCents: number
  promotionDiscountCents: number
  couponDiscountCents: number
  coupon: { code: string; kind: CouponKindValue } | null
  /** The lines, read for the promotion's name; without them the row says "Promoção" alone. */
  items?: readonly { discountCents: number; promotionName: string | null }[]
}

export type DiscountRow =
  /** `name` is the one promotion that took it all; null when several did, or none is named. */
  | { kind: "promotion"; cents: number; name: string | null; several: boolean }
  /** A free delivery takes the fee: zero while that is not agreed, and the row then says so in words. */
  | { kind: "coupon"; cents: number; code: string; freeDelivery: boolean }
  | { kind: "manual"; cents: number }

/**
 * An order's discount, a row per part, in the order it was taken: promotions, then the coupon, then
 * what the shopkeeper typed (BEELINK-194). The one reading of it, so the cart, the customer's order,
 * its receipt, the panel and the WhatsApp messages cannot break it down differently.
 *
 * A coupon has its row even at zero: a free delivery whose fee is not agreed yet took nothing so
 * far, and the customer still has to read that it is on the order.
 */
export function discountRowsOf(order: DiscountParts): DiscountRow[] {
  const rows: DiscountRow[] = []

  if (order.promotionDiscountCents > 0) {
    const names = new Set((order.items ?? []).flatMap((item) => (item.discountCents > 0 && item.promotionName ? [item.promotionName] : [])))
    const [only] = names
    rows.push({ kind: "promotion", cents: order.promotionDiscountCents, name: names.size === 1 ? (only ?? null) : null, several: names.size > 1 })
  }
  if (order.coupon) {
    rows.push({ kind: "coupon", cents: order.couponDiscountCents, code: order.coupon.code, freeDelivery: order.coupon.kind === "FREE_SHIPPING" })
  }
  const manualCents = order.discountCents - order.promotionDiscountCents - order.couponDiscountCents
  if (manualCents > 0) rows.push({ kind: "manual", cents: manualCents })

  return rows
}

/** A row as it is read: what took it off, and how much. */
export interface DiscountLine {
  /** Stable among an order's rows: there is one of each kind at most. */
  key: DiscountRow["kind"]
  label: string
  value: string
}

/** The rows in words. `money` formats cents in the reader's language; the sentences are the dictionary's. */
export function discountLinesOf(order: DiscountParts, money: (cents: number) => string, text: UiMessages["orders"]["discountRows"]): DiscountLine[] {
  return discountRowsOf(order).map((row) => {
    switch (row.kind) {
      case "promotion":
        return { key: row.kind, label: row.name ? format(text.promotionNamed, { name: row.name }) : row.several ? text.promotions : text.promotion, value: `− ${money(row.cents)}` }
      case "coupon":
        return { key: row.kind, label: format(text.coupon, { code: row.code }), value: row.freeDelivery && row.cents === 0 ? text.freeDelivery : `− ${money(row.cents)}` }
      case "manual":
        return { key: row.kind, label: text.manual, value: `− ${money(row.cents)}` }
    }
  })
}

/** What a promotion took off one line, as the line says it under its name; null when it took nothing. */
export function linePromotionOf(
  item: { discountCents: number; promotionName: string | null },
  money: (cents: number) => string,
  text: UiMessages["orders"]["discountRows"],
): string | null {
  if (item.discountCents <= 0 || !item.promotionName) return null
  return format(text.linePromotion, { name: item.promotionName, value: money(item.discountCents) })
}

/** Mirrors the wire's `CouponRefusalReason`. */
export type CouponRefusalValue = "NOT_FOUND" | "EXPIRED" | "EXHAUSTED" | "INACTIVE" | "CUSTOMER_LIMIT" | "NOT_APPLICABLE" | "BELOW_MINIMUM"

/** A coupon the pricing did not take, as the wire tells it. */
export interface CouponRefusal {
  reason: CouponRefusalValue
  /** On `BELOW_MINIMUM`: what the products have to add up to, after promotions. */
  minSubtotalCents?: number
}

/**
 * Why a code is not taken, in the shopper's words — the same sentence whether the quote said it
 * before the order or the order was refused over it. A coupon that does not apply on a pick-up is
 * nearly always a free delivery, the one refusal the shopper can undo by choosing a delivery.
 */
export function couponRefusalTextOf(
  refusal: CouponRefusal,
  context: { pickup: boolean; money: (cents: number) => string },
  text: Pick<UiMessages["storefront"], "couponRefusals" | "couponPickupHint">,
): string {
  if (refusal.reason === "BELOW_MINIMUM") return format(text.couponRefusals.BELOW_MINIMUM, { value: context.money(refusal.minSubtotalCents ?? 0) })
  if (refusal.reason === "NOT_APPLICABLE" && context.pickup) return `${text.couponRefusals.NOT_APPLICABLE} ${text.couponPickupHint}`
  return text.couponRefusals[refusal.reason]
}
