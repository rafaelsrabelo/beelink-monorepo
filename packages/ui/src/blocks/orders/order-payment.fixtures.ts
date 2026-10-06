// UI
import type { OrderPaymentView } from "@harness-monorepo/ui/lib/order-payment"

/** A Pix still to be paid. */
export const pendingPix: OrderPaymentView = {
  status: "PENDING",
  method: "PIX",
  installments: 1,
  amountCents: 15990,
  refundedCents: 0,
  refundingCents: 0,
  refundableCents: 0,
  refunds: [],
  expiresAt: "2026-10-08T02:59:59.999Z",
  paidAt: null,
  providerStatus: "PENDING",
  lastError: null,
  strays: [],
}

/** A Pix paid: the money is in the shop's account. */
export const paidPix: OrderPaymentView = { ...pendingPix, status: "RECEIVED", providerStatus: "RECEIVED", paidAt: "2026-10-06T13:02:00.000Z", refundableCents: 15990 }

/** A card approved in three instalments: paid, the money still held by Asaas. */
export const paidCard: OrderPaymentView = { ...paidPix, method: "CREDIT_CARD", installments: 3, status: "CONFIRMED", providerStatus: "CONFIRMED" }

/** A charge Asaas refused to create, with why in its words. */
export const refused: OrderPaymentView = { ...pendingPix, status: "FAILED", expiresAt: null, providerStatus: null, lastError: "O CPF ou CNPJ informado é inválido." }

/** Paid after the order was cancelled. */
export const paidAfterCancelled: OrderPaymentView = { ...paidPix, strays: [{ id: "stray-1", reason: "ORDER_CANCELLED", method: "PIX", amountCents: 15990, paidAt: "2026-10-06T13:02:00.000Z", refundableCents: 15990, resolvedAt: null }] }

/** Paid twice: the second payment is beside the first. */
export const paidTwice: OrderPaymentView = { ...paidPix, strays: [{ id: "stray-2", reason: "ORDER_ALREADY_PAID", method: "PIX", amountCents: 15990, paidAt: "2026-10-06T13:40:00.000Z", refundableCents: 15990, resolvedAt: null }] }

const refund = { id: "refund-1", amountCents: 5000, status: "DONE", origin: "PANEL", reason: "Produto com defeito", lastError: null, stray: false, requestedAt: "2026-10-06T15:00:00.000Z", doneAt: "2026-10-06T15:00:02.000Z" } as const

/** A Pix given back in part: the shop still holds the rest. */
export const partlyRefunded: OrderPaymentView = { ...paidPix, status: "PARTIALLY_REFUNDED", refundedCents: 5000, refundableCents: 10990, refunds: [refund] }

/** A card whose refund Asaas took and has not concluded: days, on a card. */
export const refundingCard: OrderPaymentView = {
  ...paidCard,
  providerStatus: "REFUND_IN_PROGRESS",
  refundingCents: 15990,
  refundableCents: 0,
  refunds: [{ ...refund, id: "refund-2", amountCents: 15990, status: "PROCESSING", origin: "CANCELLATION", reason: "Sem estoque", doneAt: null }],
}

/** All of it back, part asked here and the rest made at Asaas's own panel. */
export const refundedWhole: OrderPaymentView = {
  ...paidPix,
  status: "REFUNDED",
  providerStatus: "REFUNDED",
  refundedCents: 15990,
  refundableCents: 0,
  refunds: [refund, { ...refund, id: "refund-3", amountCents: 10990, origin: "ASAAS", reason: null, requestedAt: "2026-10-07T12:00:00.000Z", doneAt: "2026-10-07T12:00:00.000Z" }],
}

/** A refund Asaas refused for want of balance, and one it never answered. */
export const refundRefused: OrderPaymentView = {
  ...paidPix,
  refundableCents: 10990,
  refunds: [
    { ...refund, id: "refund-4", amountCents: 15990, status: "REFUSED", lastError: "Saldo insuficiente para realizar o estorno.", doneAt: null },
    { ...refund, id: "refund-5", status: "REQUESTED", doneAt: null },
  ],
}

/** Paid twice, and the second payment given back: nothing left to settle. */
export const strayResolved: OrderPaymentView = {
  ...paidPix,
  strays: [{ id: "stray-2", reason: "ORDER_ALREADY_PAID", method: "PIX", amountCents: 15990, paidAt: "2026-10-06T13:40:00.000Z", refundableCents: 0, resolvedAt: "2026-10-06T14:00:00.000Z" }],
  refunds: [{ ...refund, id: "refund-6", amountCents: 15990, stray: true, reason: "Pago em dobro" }],
}
