/** Mirrors the wire's `OrderPaymentStatus`; this package imports no contracts. */
export type OrderPaymentStatusValue = "PENDING" | "CONFIRMED" | "RECEIVED" | "OVERDUE" | "REFUNDED" | "PARTIALLY_REFUNDED" | "CANCELLED" | "FAILED"

/** What an order is charged with online. Mirrors the wire's `OnlinePaymentMethod`. */
export type OnlinePaymentValue = "PIX" | "CREDIT_CARD"

/** Money that arrived and is not the order's payment. Mirrors the wire's `StrayPayment`. */
export interface StrayPaymentView {
  reason: "ORDER_CANCELLED" | "ORDER_ALREADY_PAID"
  method: OnlinePaymentValue
  amountCents: number
  /** ISO-8601. */
  paidAt: string
}

/** An order's charge as its shop reads it. Mirrors the wire's `ShopOrderPayment`. */
export interface OrderPaymentView {
  status: OrderPaymentStatusValue
  method: OnlinePaymentValue
  /** 1 is in full. */
  installments: number
  amountCents: number
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
export type OrderPaymentState = "paid" | "awaiting" | "refunded" | "partlyRefunded"

/** What a row needs to say it. */
export interface PaidRow {
  status: "RECEIVED" | "ACCEPTED" | "PREPARING" | "OUT_FOR_DELIVERY" | "DELIVERED" | "CANCELLED"
  paymentChannel?: "OFFLINE" | "ONLINE"
  payment?: { status: OrderPaymentStatusValue } | null
}

/**
 * Where an order charged online stands for its shop (BEELINK-207): paid, refunded, or still waiting
 * for money — with a charge or without one yet, which to the shop is the same wait. Null for an
 * order settled with the shop, which bee-link never knows to be paid, and for a cancelled one
 * nobody paid: nothing is waited for.
 */
export function orderPaymentStateOf({ status, paymentChannel, payment }: PaidRow): OrderPaymentState | null {
  if (paymentChannel !== "ONLINE") return null
  if (payment?.status === "CONFIRMED" || payment?.status === "RECEIVED") return "paid"
  if (payment?.status === "PARTIALLY_REFUNDED") return "partlyRefunded"
  if (payment?.status === "REFUNDED") return "refunded"
  return status === "CANCELLED" ? null : "awaiting"
}
