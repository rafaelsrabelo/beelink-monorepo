import type { CouponKindValue } from "@harness-monorepo/ui/lib/order-discounts"
import type { OrderFulfillmentValue, OrderPaymentValue } from "@harness-monorepo/ui/lib/order-form"
import type { ShippingWindowValue } from "@harness-monorepo/ui/lib/shipping"

// Block
import type { OrderCashbackView } from "@harness-monorepo/ui/lib/cashback"
import type { OrderPaymentStatusValue, OrderPaymentView } from "@harness-monorepo/ui/lib/order-payment"

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
  /** Where it is paid; absent reads as settled with the shop. */
  paymentChannel?: "OFFLINE" | "ONLINE"
  /** Its charge at Asaas, when it is charged online and has one. */
  payment?: { status: OrderPaymentStatusValue; refundingCents?: number } | null
  /** How many payments arrived that it did not ask for (BEELINK-207). */
  strays?: number
  totalCents: number
  /** Null while a delivery's fee is not agreed: the total then reads "+ frete". */
  deliveryFeeCents: number | null
  itemsCount: number
  /** ISO-8601. */
  placedAt: string
}

/** Who set a status. Mirrors the wire's `OrderActor`. */
export type OrderActorValue = "SHOPKEEPER" | "CUSTOMER" | "SYSTEM" | "CARRIER"

/** One line as it was photographed when the order was placed. */
export interface OrderDetailItem {
  id: string
  productName: string
  variantLabel: string | null
  sku: string | null
  unitPriceCents: number
  quantity: number
  lineTotalCents: number
  /** What a promotion took off this line; zero with none. */
  discountCents: number
  /** The promotion's name as it was; null with none. */
  promotionName: string | null
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
  /** Where it is paid; absent reads as settled with the shop. */
  paymentChannel?: "OFFLINE" | "ONLINE"
  /** Its charge at Asaas (BEELINK-207): drawn on an order charged online, null while it has none. */
  payment?: OrderPaymentView | null
  items: readonly OrderDetailItem[]
  subtotalCents: number
  /** Null while a delivery's fee is not agreed (BEELINK-170); zero is a free delivery. */
  deliveryFeeCents: number | null
  /** The window the checkout quoted (BEELINK-178); null or absent where nothing was. */
  deliveryWindow?: ShippingWindowValue | null
  /** Everything taken off; the two below are its named parts, and the rest is what the shopkeeper typed. */
  discountCents: number
  promotionDiscountCents: number
  couponDiscountCents: number
  /** The coupon it took, as it was. */
  coupon: { code: string; kind: CouponKindValue } | null
  /** What it earns in cashback, and where that credit stands (BEELINK-242); null when it earns none. */
  cashback: OrderCashbackView | null
  /** The customer's credit spent on it (BEELINK-244): out of `totalCents` already, and no part of `discountCents`. */
  cashbackUsedCents: number
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
