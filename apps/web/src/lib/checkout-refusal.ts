// Types
import type { OrderStockShortage } from "@harness-monorepo/contracts"
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
const REREAD = new Set(["AUTH_UNAUTHENTICATED", "ORDER_DELIVERY_ADDRESS_MISSING", "ORDER_PAYMENT_NOT_ACCEPTED"])

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

/**
 * Why the cart's order was refused, in the shopper's words — never the panel's, which talk to the
 * shop — naming the lines the API named, as the cart shows them.
 */
export function checkoutRefusalOf({ errorCode, details }: CheckoutRefusal, rows: readonly CartRow[], text: UiMessages["storefront"]): string {
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
    case "ORDER_PAYMENT_NOT_ACCEPTED":
      return text.checkoutPaymentGone
    case "ORDER_DELIVERY_ADDRESS_MISSING":
      return text.checkoutAddressGone
    case "AUTH_UNAUTHENTICATED":
      return text.checkoutSignedOut
    case "RATE_LIMITED":
    case "TOO_MANY_REQUESTS":
      return text.checkoutTooMany
    default:
      return text.checkoutFailed
  }
}
