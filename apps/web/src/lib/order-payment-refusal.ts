// Types
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

/**
 * Why a charge was not made, in the shopper's words, from the code the shop's handler answered
 * (`OrderPaymentErrorCode`, and the order's and the session's own). What Asaas said is the shop's
 * to read on the order, never the customer's: a refusal there is told as one, and no more.
 */
export function orderPaymentRefusalOf(errorCode: string | null, text: UiMessages["storefront"]): string {
  switch (errorCode) {
    case "PAYMENT_NOT_ONLINE":
      return text.paymentRefusedNotOnline
    case "ORDER_CANCELLED":
      return text.paymentRefusedOrderCancelled
    case "PAYMENT_AWAITING_TOTAL":
      return text.paymentRefusedAwaitingTotal
    case "PAYMENT_ALREADY_PAID":
      return text.paymentRefusedAlreadyPaid
    case "PAYMENT_IN_PROGRESS":
      return text.paymentRefusedInProgress
    case "PAYMENT_BELOW_MINIMUM":
      return text.paymentRefusedBelowMinimum
    case "PAYMENT_DOCUMENT_MISSING":
      return text.paymentRefusedDocumentMissing
    case "PAYMENT_REFUSED":
      return text.paymentRefusedRefused
    case "PAYMENT_UNAVAILABLE":
      return text.paymentRefusedUnavailable
    case "AUTH_UNAUTHENTICATED":
      return text.paymentRefusedSignedOut
    case "RATE_LIMITED":
    case "TOO_MANY_REQUESTS":
      return text.paymentRefusedTooMany
    default:
      return text.paymentRefusedFailed
  }
}

/** How long the screen waits before reading again after `PAYMENT_IN_PROGRESS`: another request is making the charge. */
export const IN_PROGRESS_REREAD_MS = 4_000

/**
 * The refusals that mean the charge on screen is not the one the API holds — it was paid, the order
 * was cancelled or its fee reopened meanwhile, or another request is making it: the screen reads again.
 */
const REREAD: ReadonlySet<string> = new Set(["PAYMENT_ALREADY_PAID", "PAYMENT_IN_PROGRESS", "ORDER_CANCELLED", "PAYMENT_AWAITING_TOTAL", "PAYMENT_NOT_ONLINE"])

export function rereadsThePayment(errorCode: string | null): boolean {
  return errorCode !== null && REREAD.has(errorCode)
}
