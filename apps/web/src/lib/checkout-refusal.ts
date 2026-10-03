// Types
import type { CouponRefusalReason, OrderCouponRefusedDetails, OrderStockShortage } from "@harness-monorepo/contracts"
import { couponRefusalTextOf } from "@harness-monorepo/ui/lib/order-discounts"
import { format } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// App
import type { CartRow } from "./cart-view"

/** A refused order as the page holds it: the API's code, and what it said about which lines. */
export interface CheckoutRefusal {
  errorCode: string
  details?: unknown
}

/**
 * The refusals after which the page reads the shop again, because what it read has moved: the
 * shopper's session or record, or the shop's payments. Not the stock: the catalogue the cart reads is
 * cached, and a refresh would draw the same cart — the refusal names the lines instead.
 */
const REREAD = new Set(["AUTH_UNAUTHENTICATED", "ORDER_DELIVERY_ADDRESS_MISSING", "ORDER_ADDRESS_NOT_FOUND", "ORDER_PAYMENT_NOT_ACCEPTED"])

/** The refusals after which the cart is priced again: the coupon or the delivery's fee it was sent with no longer holds. */
export const REPRICED: ReadonlySet<string> = new Set(["ORDER_COUPON_REFUSED", "ORDER_SHIPPING_UNAVAILABLE", "ORDER_SHIPPING_CHANGED"])

export function rereadsTheCart(errorCode: string): boolean {
  return REREAD.has(errorCode)
}

function shortagesIn(details: unknown): OrderStockShortage[] {
  const shortages = typeof details === "object" && details !== null && "shortages" in details ? details.shortages : null
  return Array.isArray(shortages)
    ? shortages.filter((entry): entry is OrderStockShortage => typeof entry?.variantId === "string" && typeof entry?.available === "number")
    : []
}

function variantIdsIn(details: unknown): string[] {
  const ids = typeof details === "object" && details !== null && "variantIds" in details ? details.variantIds : null
  return Array.isArray(ids) ? ids.filter((id): id is string => typeof id === "string") : []
}

const COUPON_REFUSALS = ["NOT_FOUND", "EXPIRED", "EXHAUSTED", "INACTIVE", "CUSTOMER_LIMIT", "NOT_FIRST_PURCHASE", "NOT_APPLICABLE", "BELOW_MINIMUM"] as const satisfies readonly CouponRefusalReason[]

/** Why the order's coupon was refused, as the API said it; null when the answer names no reason this app knows. */
function couponRefusalIn(details: unknown): OrderCouponRefusedDetails | null {
  if (typeof details !== "object" || details === null || !("reason" in details)) return null
  const reason = COUPON_REFUSALS.find((known) => known === details.reason)
  if (!reason) return null
  const minimum = "minSubtotalCents" in details && typeof details.minSubtotalCents === "number" ? details.minSubtotalCents : undefined
  return { reason, ...(minimum === undefined ? {} : { minSubtotalCents: minimum }) }
}

/** What a refusal's sentence is written with, beyond the cart's rows: how the order leaves, and money in the reader's language. */
export interface CheckoutRefusalContext {
  pickup: boolean
  money: (cents: number) => string
}

/**
 * Why the cart's order was refused, in the shopper's words — never the panel's, which talk to the
 * shop — naming the lines the API named, as the cart shows them.
 */
export function checkoutRefusalOf({ errorCode, details }: CheckoutRefusal, rows: readonly CartRow[], text: UiMessages["storefront"], context: CheckoutRefusalContext): string {
  const nameOf = (variantId: string) => {
    const row = rows.find((entry) => entry.orderVariantId === variantId)
    return row ? (row.variantLabel ? `${row.name} (${row.variantLabel})` : row.name) : null
  }

  switch (errorCode) {
    case "ORDER_STOCK_INSUFFICIENT": {
      const items = shortagesIn(details).flatMap(({ variantId, available }) => {
        const name = nameOf(variantId)
        if (!name) return []
        return [available > 0 ? format(text.checkoutStockLeft, { name, left: String(available) }) : format(text.checkoutStockNone, { name })]
      })
      return items.length ? format(text.checkoutStockShort, { items: items.join("; ") }) : text.checkoutStockShortAny
    }
    case "ORDER_VARIANT_INVALID": {
      const names = variantIdsIn(details).flatMap((variantId) => nameOf(variantId) ?? [])
      return names.length ? format(text.checkoutProductGone, { items: names.join("; ") }) : text.checkoutProductGoneAny
    }
    // The coupon stopped holding between the price on screen and the order: said with the reason the field would give.
    case "ORDER_COUPON_REFUSED": {
      const refusal = couponRefusalIn(details)
      return refusal ? format(text.checkoutCouponGone, { reason: couponRefusalTextOf(refusal, context, text) }) : text.checkoutFailed
    }
    case "ORDER_PAYMENT_NOT_ACCEPTED":
      return text.checkoutPaymentGone
    case "ORDER_DELIVERY_ADDRESS_MISSING":
      return text.checkoutAddressGone
    case "ORDER_ADDRESS_NOT_FOUND":
      return text.checkoutAddressChosenGone
    // The shop's delivery rules moved since the cart was priced: it is priced again, and says what stands now.
    case "ORDER_SHIPPING_UNAVAILABLE":
      return text.checkoutShippingUnavailable
    case "ORDER_SHIPPING_CHANGED":
      return text.checkoutShippingChanged
    // A carrier's label needs a CPF of who receives it, and a real one (BEELINK-187).
    case "ORDER_RECIPIENT_DOCUMENT_MISSING":
    case "CUSTOMER_CPF_INVALID":
      return text.checkoutRecipientDocumentIssue
    case "AUTH_UNAUTHENTICATED":
      return text.checkoutSignedOut
    case "RATE_LIMITED":
    case "TOO_MANY_REQUESTS":
      return text.checkoutTooMany
    default:
      return text.checkoutFailed
  }
}
