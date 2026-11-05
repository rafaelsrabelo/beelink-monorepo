// UI
import { Badge } from "@harness-monorepo/ui/components/badge"

// Locales
import { defaultMessages } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Lib
import { orderStatusLabelOf } from "@harness-monorepo/ui/lib/order-status-label"

// Block
import type { OrderFulfillmentValue, OrderStatusValue } from "./order-types"

/** Filled where the order is done with, outlined where it still moves, muted where it stopped. */
const VARIANT: Record<OrderStatusValue, "default" | "secondary" | "outline"> = {
  RECEIVED: "outline",
  ACCEPTED: "outline",
  PREPARING: "outline",
  OUT_FOR_DELIVERY: "outline",
  DELIVERED: "default",
  CANCELLED: "secondary",
}

export interface OrderStatusBadgeProps {
  status: OrderStatusValue
  /** Required: a pick-up's last two steps are named its own way, and a badge that guessed would say "saiu para entrega". */
  fulfillment: OrderFulfillmentValue
  messages?: UiMessages
}

/** Where an order stands, in the words the shopkeeper moves it through. */
export function OrderStatusBadge({ status, fulfillment, messages = defaultMessages }: OrderStatusBadgeProps) {
  return <Badge variant={VARIANT[status]}>{orderStatusLabelOf(status, fulfillment, messages)}</Badge>
}
