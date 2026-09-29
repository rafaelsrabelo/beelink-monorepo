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
  }
  fulfillment: OrderFulfillmentValue
  /**
   * Where it went, as it was when placed. Null on a pick-up, and on a delivery placed before orders
   * kept it — never the customer's address of today.
   */
  deliveryAddress: {
    /** Who receives it: the customer's name as it was. */
    recipientName: string
    zipCode: string | null
    street: string
    number: string | null
    complement: string | null
    neighborhood: string | null
    city: string
    state: string | null
  } | null
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

/** Who brings a delivery. Mirrors the wire's `OrderDeliveryKind`. */
export type OrderDeliveryKindValue = "OWN" | "CARRIER"

/** How a delivery goes, as the shopkeeper told it. Mirrors the wire's `OrderDelivery`; days are `YYYY-MM-DD`. */
export interface OrderDeliveryValue {
  kind: OrderDeliveryKindValue
  carrier: string | null
  service: string | null
  trackingCode: string | null
  trackingUrl: string | null
  estimateFrom: string | null
  estimateTo: string | null
}
