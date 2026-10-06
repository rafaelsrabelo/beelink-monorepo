// Types
import type { ConversationLastMessage, ConversationMessage, OrderFulfillment, OrderStatus } from "@harness-monorepo/contracts"

/** Which words tell of a status in a conversation (BEELINK-236): a pick-up's end is "picked up", not "delivered". */
export type StatusNoticeKey = OrderStatus | "PICKED_UP"

/** Every notice a conversation tells (BEELINK-207): a status, a payment approved, a cancellation for want of payment, or money given back (BEELINK-208). */
export type NoticeKey = StatusNoticeKey | "PAYMENT_APPROVED" | "CANCELLED_UNPAID" | "PAYMENT_REFUNDED"

export function statusNoticeKeyOf(status: OrderStatus, fulfillment: OrderFulfillment): StatusNoticeKey {
  return status === "DELIVERED" && fulfillment === "PICKUP" ? "PICKED_UP" : status
}

type Notice = Exclude<ConversationMessage, { kind: "MESSAGE" }> | Exclude<ConversationLastMessage, { kind: "MESSAGE" }>

/** The words of a notice, whichever it is: a cancellation nobody at the shop decided says why. */
export function noticeKeyOf(notice: Notice, fulfillment: OrderFulfillment): NoticeKey {
  if (notice.kind === "PAYMENT") return "PAYMENT_APPROVED"
  if (notice.kind === "REFUND") return "PAYMENT_REFUNDED"
  return notice.status === "CANCELLED" && notice.unpaid ? "CANCELLED_UNPAID" : statusNoticeKeyOf(notice.status, fulfillment)
}

/** A notice in its reader's words: a refund's says how much, in the reader's money. */
export function noticeTextOf(notice: Notice, fulfillment: OrderFulfillment, words: Record<NoticeKey, string>, locale: string): string {
  const sentence = words[noticeKeyOf(notice, fulfillment)]
  if (notice.kind !== "REFUND") return sentence
  return sentence.replace("{amount}", new Intl.NumberFormat(locale, { style: "currency", currency: "BRL" }).format(notice.amountCents / 100))
}
