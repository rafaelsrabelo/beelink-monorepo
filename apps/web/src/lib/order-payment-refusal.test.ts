// Libs
import { describe, expect, it } from "vitest"

// Types
import type { OrderPaymentErrorCode } from "@harness-monorepo/contracts"

// UI
import { ptBR } from "@harness-monorepo/ui/locales/pt-BR"

// App
import { orderPaymentRefusalOf, rereadsThePayment } from "./order-payment-refusal"

const text = ptBR.storefront

describe("orderPaymentRefusalOf — why a charge was not made", () => {
  const SENTENCES: Record<OrderPaymentErrorCode, string> = {
    PAYMENT_NOT_ONLINE: text.paymentRefusedNotOnline,
    PAYMENT_AWAITING_TOTAL: text.paymentRefusedAwaitingTotal,
    PAYMENT_ALREADY_PAID: text.paymentRefusedAlreadyPaid,
    PAYMENT_IN_PROGRESS: text.paymentRefusedInProgress,
    PAYMENT_BELOW_MINIMUM: text.paymentRefusedBelowMinimum,
    PAYMENT_DOCUMENT_MISSING: text.paymentRefusedDocumentMissing,
    PAYMENT_REFUSED: text.paymentRefusedRefused,
    PAYMENT_UNAVAILABLE: text.paymentRefusedUnavailable,
  }

  // The record is typed by the contract: a code added there fails to compile here until it has a sentence.
  it.each(Object.entries(SENTENCES))("says %s in its own sentence", (errorCode, sentence) => {
    expect(orderPaymentRefusalOf(errorCode, text)).toBe(sentence)
  })

  it("gives every code of the contract a sentence of its own", () => {
    expect(new Set(Object.values(SENTENCES)).size).toBe(Object.keys(SENTENCES).length)
    expect(Object.values(SENTENCES)).not.toContain(text.paymentRefusedFailed)
  })

  it("says a cancelled order, an ended session and too many tries, and anything else as a failure to try again", () => {
    expect(orderPaymentRefusalOf("ORDER_CANCELLED", text)).toBe(text.paymentRefusedOrderCancelled)
    expect(orderPaymentRefusalOf("AUTH_UNAUTHENTICATED", text)).toBe(text.paymentRefusedSignedOut)
    expect(orderPaymentRefusalOf("RATE_LIMITED", text)).toBe(text.paymentRefusedTooMany)
    expect(orderPaymentRefusalOf("UNKNOWN", text)).toBe(text.paymentRefusedFailed)
    expect(orderPaymentRefusalOf(null, text)).toBe(text.paymentRefusedFailed)
  })

  it("never repeats what Asaas said: a refusal is told as one, and no more", () => {
    expect(orderPaymentRefusalOf("PAYMENT_REFUSED", text)).toBe("A cobrança não pôde ser gerada. Fale com a loja para combinar o pagamento.")
  })
})

describe("rereadsThePayment — the refusals that say the screen is behind", () => {
  it("reads again when the charge moved under the screen, and not when trying again is the shopper's", () => {
    expect(["PAYMENT_ALREADY_PAID", "PAYMENT_IN_PROGRESS", "ORDER_CANCELLED", "PAYMENT_AWAITING_TOTAL", "PAYMENT_NOT_ONLINE"].every(rereadsThePayment)).toBe(true)
    expect(["PAYMENT_REFUSED", "PAYMENT_UNAVAILABLE", "PAYMENT_BELOW_MINIMUM", "PAYMENT_DOCUMENT_MISSING", "RATE_LIMITED", null].some(rereadsThePayment)).toBe(false)
  })
})
