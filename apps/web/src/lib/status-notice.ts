// Types
import type { OrderFulfillment, OrderStatus } from "@harness-monorepo/contracts"

/** Which words tell of a status in a conversation (BEELINK-236): a pick-up's end is "picked up", not "delivered". */
export type StatusNoticeKey = OrderStatus | "PICKED_UP"

export function statusNoticeKeyOf(status: OrderStatus, fulfillment: OrderFulfillment): StatusNoticeKey {
  return status === "DELIVERED" && fulfillment === "PICKUP" ? "PICKED_UP" : status
}
