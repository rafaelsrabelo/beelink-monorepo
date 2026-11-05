// Locales
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Lib
import type { OrderFulfillmentValue } from "./order-form"

type OrderStatusName = keyof UiMessages["orders"]["statuses"]

/** The two steps a pick-up names its own way. */
function isPickupStep(status: OrderStatusName): status is keyof UiMessages["orders"]["pickupStatuses"] {
  return status === "OUT_FOR_DELIVERY" || status === "DELIVERED"
}

/**
 * Where an order stands, in the panel's words. A pick-up's `OUT_FOR_DELIVERY` is the order ready at the
 * shop and its `DELIVERED` the order picked up: the customer's e-mail and order page already read them
 * so, and a panel that said "saiu para entrega" there was what kept the shop from marking it at all.
 */
export function orderStatusLabelOf(status: OrderStatusName, fulfillment: OrderFulfillmentValue, messages: UiMessages): string {
  return fulfillment === "PICKUP" && isPickupStep(status) ? messages.orders.pickupStatuses[status] : messages.orders.statuses[status]
}

/** The button that moves an order to `status`, worded as `orderStatusLabelOf` names where it lands. */
export function markAsLabelOf(status: keyof UiMessages["orders"]["detail"]["markAs"], fulfillment: OrderFulfillmentValue, messages: UiMessages): string {
  const text = messages.orders.detail
  return fulfillment === "PICKUP" && isPickupStep(status) ? text.markAsPickup[status] : text.markAs[status]
}
