// Types
import type { CustomerOrder, CustomerOrderItem, OrderPayment } from "@harness-monorepo/contracts"

// App
import type { SoldItem, StorefrontEvent } from "./storefront-event"

/**
 * Which of a shopper's orders is a purchase, when it became one, and what is told of it
 * (BEELINK-273). The one place the rule is written; the server's telling of the same purchase
 * (X7) has to say the same, or an advertising tool counts it twice.
 */

/** What the rule reads of an order — and all of it that crosses to the browser for it. */
export type PurchaseOrder = Pick<CustomerOrder, "id" | "status" | "placedBy" | "paymentChannel" | "totalCents" | "deliveryFeeCents" | "placedAt"> & {
  items: Pick<CustomerOrderItem, "productId" | "quantity" | "lineTotalCents" | "discountCents">[]
  payment: Pick<OrderPayment, "status" | "paidAt"> | null
}

/** An order counts as a purchase once it is placed, once it is paid, or not at all. */
export type PurchaseMoment = "PLACED" | "PAID" | "NEVER"

/**
 * The decision, and the line that inverts it. A shop that charges on the site counts the payment
 * confirmed, never the order alone. A shop that settles with its customer counts the order placed:
 * it is the only moment such a shop has, and most shops are that one — at the cost of counting an
 * order cancelled afterwards. Answering "NEVER" where it says "PLACED" stops counting those.
 *
 * An order charged online with nothing to pay — a coupon or credit covered a closed total — has no
 * charge to wait for, and is settled like the other kind.
 */
export function purchaseCountsWhen(order: Pick<PurchaseOrder, "paymentChannel" | "totalCents" | "deliveryFeeCents">): PurchaseMoment {
  const nothingToPay = order.totalCents === 0 && order.deliveryFeeCents !== null
  if (order.paymentChannel === "ONLINE" && !nothingToPay) return "PAID"

  return "PLACED"
}

/**
 * When the order became a purchase, ISO-8601, or null for one that is none: placed by the shop in
 * its panel, cancelled, charged online and not paid, or with its money given back.
 */
export function purchasedAtOf(order: PurchaseOrder): string | null {
  if (order.placedBy !== "CUSTOMER" || order.status === "CANCELLED") return null

  const moment = purchaseCountsWhen(order)
  if (moment === "PLACED") return order.placedAt
  if (moment === "NEVER") return null

  const paid = order.payment?.status === "CONFIRMED" || order.payment?.status === "RECEIVED"
  return paid ? (order.payment?.paidAt ?? null) : null
}

/**
 * How long after it counted the browser still tells a purchase: a day. Meta counts once an event
 * told from the browser and from the server only when the two arrive within 48 hours of each other,
 * so a purchase told here days after the server told it would be a second one — and one told late
 * lands on the wrong day of the shop's report.
 */
export const PURCHASE_TOLD_WITHIN_MS = 24 * 60 * 60 * 1000

export interface Purchase {
  orderId: string
  /** The same from the browser and from the server, which is what lets the two be counted once. */
  eventId: string
  event: Extract<StorefrontEvent, { name: "Purchase" }>
}

/** `purchase-<the order's id>`: the order's own id, the one thing both sides know it by for good. */
export function purchaseEventIdOf(orderId: string): string {
  return `purchase-${orderId}`
}

/**
 * The purchase an order is, to be told now — or null: it is not one, or it became one more than a
 * day ago.
 *
 * Its value is the order's total: what the customer pays, delivery included, after every discount
 * and credit — on an order charged online, the charge itself. A line costs what it cost once its
 * promotion was taken off; a coupon and credit are the order's and belong to no line, so the lines
 * need not add up to the value. A line whose product is gone names nothing and is left out.
 */
export function purchaseOf(order: PurchaseOrder, now: Date): Purchase | null {
  const at = purchasedAtOf(order)
  if (at === null || now.getTime() - new Date(at).getTime() > PURCHASE_TOLD_WITHIN_MS) return null

  const items = order.items.flatMap((item): SoldItem[] => (item.productId ? [{ productId: item.productId, qty: item.quantity, paidCents: item.lineTotalCents - item.discountCents }] : []))
  return { orderId: order.id, eventId: purchaseEventIdOf(order.id), event: { name: "Purchase", items, valueCents: order.totalCents } }
}

/** An order cut down to what the rule reads, for the screen that learns of its payment in the browser. */
export function purchaseOrderOf(order: CustomerOrder): PurchaseOrder {
  return {
    id: order.id,
    status: order.status,
    placedBy: order.placedBy,
    paymentChannel: order.paymentChannel,
    totalCents: order.totalCents,
    deliveryFeeCents: order.deliveryFeeCents,
    placedAt: order.placedAt,
    items: order.items.map((item) => ({ productId: item.productId, quantity: item.quantity, lineTotalCents: item.lineTotalCents, discountCents: item.discountCents })),
    payment: order.payment ? { status: order.payment.status, paidAt: order.payment.paidAt } : null,
  }
}
