// Types
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

/** The refusals after which the page must read the shop again: the shelf or the shopper's session moved. */
const REREAD = new Set(["ORDER_STOCK_INSUFFICIENT", "ORDER_VARIANT_INVALID", "ORDER_DELIVERY_ADDRESS_MISSING", "AUTH_UNAUTHENTICATED"])

/** Why the cart's order was refused, in the shopper's words — never the panel's, which talk to the shop. */
export function checkoutRefusalOf(errorCode: string, text: UiMessages["storefront"]): string {
  switch (errorCode) {
    case "ORDER_STOCK_INSUFFICIENT":
      return text.checkoutStockShort
    case "ORDER_VARIANT_INVALID":
      return text.checkoutProductGone
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

export function rereadsTheCart(errorCode: string): boolean {
  return REREAD.has(errorCode)
}
