// UI
import { Badge } from "@harness-monorepo/ui/components/badge"

// Locales
import { defaultMessages } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import type { OrderStatusValue } from "./order-types"

/** Filled where the order is done with, outlined where it still moves, muted where it stopped. */
const VARIANT: Record<OrderStatusValue, "default" | "secondary" | "outline"> = {
  RECEIVED: "outline",
  ACCEPTED: "outline",
  PREPARING: "outline",
  OUT_FOR_DELIVERY: "outline",
  DELIVERED: "default",
  CANCELLED: "secondary",
}

/** Where an order stands, in the words the shopkeeper moves it through. */
export function OrderStatusBadge({ status, messages = defaultMessages }: { status: OrderStatusValue; messages?: UiMessages }) {
  return <Badge variant={VARIANT[status]}>{messages.orders.statuses[status]}</Badge>
}
