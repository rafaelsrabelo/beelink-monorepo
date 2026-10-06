// Types
import type { CustomerOrderSummary, OrderPaymentStatus } from "@harness-monorepo/contracts"
import type { StorefrontOrderPaymentStatus } from "@harness-monorepo/ui/blocks/storefront/storefront-order-payment"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

/** What the label is read from: the same fields on an order's page and on its card in the list. */
export type PaidOrder = Pick<CustomerOrderSummary, "status" | "fulfillment" | "deliveryFeeCents" | "paymentChannel" | "payment">

export interface OrderPaymentLabel extends StorefrontOrderPaymentStatus {
  /** There is something the customer can do about it on the payment screen: pay, or make a charge to pay. */
  payable: boolean
}

const PAID: readonly OrderPaymentStatus[] = ["CONFIRMED", "RECEIVED"]

/**
 * Whether a charge holds the customer's money: paid, or paid and given back only in part. Such an
 * order is not cancelled without a refund — the API answers `ORDER_PAID` — so no cancel is offered.
 */
export function holdsMoney(payment: { status: OrderPaymentStatus } | null | undefined): boolean {
  return payment !== null && payment !== undefined && (PAID.includes(payment.status) || payment.status === "PARTIALLY_REFUNDED")
}

/**
 * Where an order's online payment stands, in the customer's words (BEELINK-205), and whether the
 * payment screen has something for them. Null for an order settled with the shop, which is never
 * "approved" here, and for a cancelled one that never had a charge.
 *
 * What was paid stays said on a cancelled order: the money is the customer's to know about. A charge
 * past its time reads as expired whether or not Asaas was heard saying so — `OVERDUE` is written
 * only when the order next talks to Asaas, and the time on it is enough.
 */
export function orderPaymentLabelOf(order: PaidOrder, text: UiMessages["storefront"], now: Date): OrderPaymentLabel | null {
  if (order.paymentChannel !== "ONLINE") return null

  const payment = order.payment
  // A refund Asaas took and has not concluded (BEELINK-208): days, on a card.
  if (holdsMoney(payment) && (payment?.refundingCents ?? 0) > 0) return { label: text.orderPayRefunding, tone: "stop", payable: false }
  if (payment && PAID.includes(payment.status)) return { label: text.orderPayApproved, tone: "done", payable: false }
  if (payment?.status === "REFUNDED") return { label: text.orderPayRefunded, tone: "stop", payable: false }
  if (payment?.status === "PARTIALLY_REFUNDED") return { label: text.orderPayPartlyRefunded, tone: "stop", payable: false }
  if (order.status === "CANCELLED") return payment ? { label: text.orderPayCancelled, tone: "stop", payable: false } : null
  // Only a closed total is charged: the wait is on the shop, and there is nothing to press.
  if (order.fulfillment === "DELIVERY" && order.deliveryFeeCents === null) return { label: text.orderPayAwaitingTotal, tone: "wait", payable: false }
  // No charge yet, or one Asaas refused to make: to the customer, it is simply still to be paid.
  if (!payment || payment.status === "FAILED") return { label: text.orderPayAwaiting, tone: "wait", payable: true }
  if (payment.status === "CANCELLED") return { label: text.orderPayCancelled, tone: "stop", payable: true }
  const expired = payment.status === "OVERDUE" || (payment.expiresAt !== null && new Date(payment.expiresAt) <= now)
  return expired ? { label: text.orderPayOverdue, tone: "stop", payable: true } : { label: text.orderPayAwaiting, tone: "wait", payable: true }
}
