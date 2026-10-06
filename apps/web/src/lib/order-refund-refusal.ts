// Types
import type { OrderRefundExceedsDetails, OrderRefundRefusedDetails } from "@harness-monorepo/contracts"
import type { WebMessages } from "@/locales"

// UI
import { formatCents } from "@harness-monorepo/ui/blocks/storefront/storefront-price"

/**
 * Why a refund did not go through, in the shop's words (BEELINK-208), from the code the API answered
 * and the details that come with two of them: how much is left when it asked for more, and Asaas's
 * own sentence when Asaas refused for a reason bee-link has no name for. Null with no error.
 */
export function orderRefundRefusalOf(error: unknown, messages: WebMessages, locale: string): string | null {
  if (!error) return null
  const code = error instanceof Error && "errorCode" in error && typeof error.errorCode === "string" ? error.errorCode : "UNKNOWN"
  const details = error instanceof Error && "details" in error ? error.details : undefined
  const sentence = messages.errors[code as keyof WebMessages["errors"]] ?? messages.errors.UNKNOWN

  if (code === "REFUND_EXCEEDS") {
    const left = (details as Partial<OrderRefundExceedsDetails> | undefined)?.refundableCents
    return typeof left === "number" ? sentence.replace("{amount}", formatCents(left, locale, "BRL")) : messages.errors.REFUND_STALE
  }
  if (code === "REFUND_REFUSED") {
    const reason = (details as Partial<OrderRefundRefusedDetails> | undefined)?.reason
    return typeof reason === "string" && reason.trim() !== "" ? sentence.replace("{reason}", reason.trim()) : messages.errors.REFUND_REFUSED_UNSAID
  }
  return sentence
}
