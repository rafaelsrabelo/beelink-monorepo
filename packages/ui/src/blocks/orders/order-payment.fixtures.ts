// UI
import type { OrderPaymentView } from "@harness-monorepo/ui/lib/order-payment"

/** A Pix still to be paid. */
export const pendingPix: OrderPaymentView = {
  status: "PENDING",
  method: "PIX",
  installments: 1,
  amountCents: 15990,
  expiresAt: "2026-10-08T02:59:59.999Z",
  paidAt: null,
  providerStatus: "PENDING",
  lastError: null,
  strays: [],
}

/** A Pix paid: the money is in the shop's account. */
export const paidPix: OrderPaymentView = { ...pendingPix, status: "RECEIVED", providerStatus: "RECEIVED", paidAt: "2026-10-06T13:02:00.000Z" }

/** A card approved in three instalments: paid, the money still held by Asaas. */
export const paidCard: OrderPaymentView = { ...paidPix, method: "CREDIT_CARD", installments: 3, status: "CONFIRMED", providerStatus: "CONFIRMED" }

/** A charge Asaas refused to create, with why in its words. */
export const refused: OrderPaymentView = { ...pendingPix, status: "FAILED", expiresAt: null, providerStatus: null, lastError: "O CPF ou CNPJ informado é inválido." }

/** Paid after the order was cancelled. */
export const paidAfterCancelled: OrderPaymentView = { ...paidPix, strays: [{ reason: "ORDER_CANCELLED", method: "PIX", amountCents: 15990, paidAt: "2026-10-06T13:02:00.000Z" }] }

/** Paid twice: the second payment is beside the first. */
export const paidTwice: OrderPaymentView = { ...paidPix, strays: [{ reason: "ORDER_ALREADY_PAID", method: "PIX", amountCents: 15990, paidAt: "2026-10-06T13:40:00.000Z" }] }
