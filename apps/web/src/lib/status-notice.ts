// Types
import type { ConversationLastMessage, ConversationMessage, OrderFulfillment, OrderStatus } from "@harness-monorepo/contracts"

/** Which words tell of a status in a conversation (BEELINK-236): a pick-up's end is "picked up", not "delivered". */
export type StatusNoticeKey = OrderStatus | "PICKED_UP"

/** Every notice a conversation tells (BEELINK-207): a status, a payment approved, or a cancellation for want of payment. */
export type NoticeKey = StatusNoticeKey | "PAYMENT_APPROVED" | "CANCELLED_UNPAID"

export function statusNoticeKeyOf(status: OrderStatus, fulfillment: OrderFulfillment): StatusNoticeKey {
  return status === "DELIVERED" && fulfillment === "PICKUP" ? "PICKED_UP" : status
}

type Notice = Exclude<ConversationMessage, { kind: "MESSAGE" }> | Exclude<ConversationLastMessage, { kind: "MESSAGE" }>

/** The words of a notice, whichever it is: a cancellation nobody at the shop decided says why. */
export function noticeKeyOf(notice: Notice, fulfillment: OrderFulfillment): NoticeKey {
  if (notice.kind === "PAYMENT") return "PAYMENT_APPROVED"
  return notice.status === "CANCELLED" && notice.unpaid ? "CANCELLED_UNPAID" : statusNoticeKeyOf(notice.status, fulfillment)
}
