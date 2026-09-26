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

/** Who set a status. Mirrors the wire's `OrderActor`. */
export type OrderActorValue = "SHOPKEEPER" | "CUSTOMER" | "SYSTEM"

/** One line as it was photographed when the order was placed. */
export interface OrderDetailItem {
  id: string
  productName: string
  variantLabel: string | null
  sku: string | null
  unitPriceCents: number
  quantity: number
  lineTotalCents: number
}

/** An opened order: the wire's `Order`, as its page reads it. */
export interface OrderDetailView {
  number: number
  status: OrderStatusValue
  customer: {
    name: string
    /** Digits, with the country code. */
    phone: string | null
    address: {
      zipCode: string | null
      street: string | null
      number: string | null
      complement: string | null
      neighborhood: string | null
      city: string | null
      state: string | null
    }
  }
  fulfillment: OrderFulfillmentValue
  paymentMethod: OrderPaymentValue
  items: readonly OrderDetailItem[]
  subtotalCents: number
  deliveryFeeCents: number
  discountCents: number
  totalCents: number
  note: string | null
  /** ISO-8601. */
  placedAt: string
  /** Oldest first. */
  events: readonly { status: OrderStatusValue; actor: OrderActorValue; at: string }[]
}
