import type { OrderFulfillmentValue, OrderPaymentValue } from "@harness-monorepo/ui/lib/order-form"

/** Mirrors the wire's `OrderStatus`; this package imports no contracts. */
export type OrderStatusValue = "RECEIVED" | "ACCEPTED" | "PREPARING" | "OUT_FOR_DELIVERY" | "DELIVERED" | "CANCELLED"

export type { OrderFulfillmentValue, OrderPaymentValue } from "@harness-monorepo/ui/lib/order-form"

/** One row of the list: the wire's `OrderSummary`, as the list reads it. */
export interface OrderListItem {
  number: number
  status: OrderStatusValue
  customer: { name: string; phone: string | null }
  fulfillment: OrderFulfillmentValue
  paymentMethod: OrderPaymentValue
  totalCents: number
  itemsCount: number
  /** ISO-8601. */
  placedAt: string
}
