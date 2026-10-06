/** Mirrors the wire's `OrderPaymentStatus`; this package imports no contracts. */
export type OrderPaymentStatusValue = "PENDING" | "CONFIRMED" | "RECEIVED" | "OVERDUE" | "REFUNDED" | "PARTIALLY_REFUNDED" | "CANCELLED" | "FAILED"

/** What an order is charged with online. Mirrors the wire's `OnlinePaymentMethod`. */
export type OnlinePaymentValue = "PIX" | "CREDIT_CARD"

/** Money that arrived and is not the order's payment. Mirrors the wire's `StrayPayment`. */
export interface StrayPaymentView {
  id: string
  reason: "ORDER_CANCELLED" | "ORDER_ALREADY_PAID"
  method: OnlinePaymentValue
  amountCents: number
  /** ISO-8601. */
  paidAt: string
  /** What of it is still to be given back. */
  refundableCents: number
  /** ISO-8601: when its refund was taken; null while the shop still has to settle it. */
  resolvedAt: string | null
}

/** Where a refund stands. Mirrors the wire's `OrderRefundStatus`. */
export type OrderRefundStatusValue = "REQUESTED" | "PROCESSING" | "DONE" | "REFUSED" | "DENIED"

/** One refund as the shop reads it. Mirrors the wire's `ShopOrderRefund`. */
export interface OrderRefundView {
  id: string
  amountCents: number
  status: OrderRefundStatusValue
  origin: "PANEL" | "CANCELLATION" | "ASAAS"
  reason: string | null
  /** What Asaas said of one it refused or cancelled, in its words. */
  lastError: string | null
  /** It gave back money the order did not ask for. */
  stray: boolean
  /** ISO-8601. */
  requestedAt: string
  /** ISO-8601; null until concluded. */
  doneAt: string | null
}

/** An order's charge as its shop reads it. Mirrors the wire's `ShopOrderPayment`. */
export interface OrderPaymentView {
  status: OrderPaymentStatusValue
  method: OnlinePaymentValue
  /** 1 is in full. */
  installments: number
  amountCents: number
  /** What went back for good, what is on its way, and what a refund may still ask for. */
  refundedCents: number
  refundingCents: number
  refundableCents: number
  refunds: readonly OrderRefundView[]
  /** ISO-8601; null on a charge that never existed. */
  expiresAt: string | null
  /** ISO-8601; null until paid. */
  paidAt: string | null
  /** Asaas's own word for where it stands. */
  providerStatus: string | null
  /** What Asaas last refused about it, in its words. */
  lastError: string | null
  strays: readonly StrayPaymentView[]
}

/** Where an order's money stands, in one word of a list. */
export type OrderPaymentState = "paid" | "awaiting" | "refunding" | "refunded" | "partlyRefunded"

/** What a row needs to say it. */
export interface PaidRow {
  status: "RECEIVED" | "ACCEPTED" | "PREPARING" | "OUT_FOR_DELIVERY" | "DELIVERED" | "CANCELLED"
  paymentChannel?: "OFFLINE" | "ONLINE"
  payment?: { status: OrderPaymentStatusValue; refundingCents?: number } | null
}

/**
 * Where an order charged online stands for its shop (BEELINK-207): paid, refunded — or with its
 * refund on its way, which a card takes days to conclude (BEELINK-208) — or still waiting
 * for money — with a charge or without one yet, which to the shop is the same wait. Null for an
 * order settled with the shop, which bee-link never knows to be paid, and for a cancelled one
 * nobody paid: nothing is waited for.
 */
export function orderPaymentStateOf({ status, paymentChannel, payment }: PaidRow): OrderPaymentState | null {
  if (paymentChannel !== "ONLINE") return null
  const holds = payment?.status === "CONFIRMED" || payment?.status === "RECEIVED" || payment?.status === "PARTIALLY_REFUNDED"
  if (holds && (payment.refundingCents ?? 0) > 0) return "refunding"
  if (payment?.status === "CONFIRMED" || payment?.status === "RECEIVED") return "paid"
  if (payment?.status === "PARTIALLY_REFUNDED") return "partlyRefunded"
  if (payment?.status === "REFUNDED") return "refunded"
  return status === "CANCELLED" ? null : "awaiting"
}

/** Whether the shop holds money for the order that a refund may still ask for. */
export function isRefundable(payment: Pick<OrderPaymentView, "status" | "refundableCents"> | null | undefined): boolean {
  if (!payment) return false
  return (payment.status === "CONFIRMED" || payment.status === "RECEIVED" || payment.status === "PARTIALLY_REFUNDED") && payment.refundableCents > 0
}
