// Types
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

/**
 * Why a cancel was refused, in the shopper's words, from the error code the shop's handler
 * answered: the shop got there first, it was already cancelled, the session ended, or anything else.
 */
export function orderCancelRefusalOf(errorCode: string | null, text: UiMessages["storefront"]): string {
  switch (errorCode) {
    case "ORDER_NOT_CANCELLABLE":
      return text.orderCancelRefusedAccepted
    case "ORDER_CANCELLED":
      return text.orderCancelRefusedDone
    case "AUTH_UNAUTHENTICATED":
      return text.orderCancelSignedOut
    default:
      return text.orderCancelFailed
  }
}
