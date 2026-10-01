// Types
import type { CustomerOrder, OrderStatus } from "@harness-monorepo/contracts"
import type { StorefrontOrderAddressProps } from "@harness-monorepo/ui/blocks/storefront/storefront-order-address"
import type { StorefrontOrderHistoryEvent } from "@harness-monorepo/ui/blocks/storefront/storefront-order-history"
import type { StorefrontOrderItemLine } from "@harness-monorepo/ui/blocks/storefront/storefront-order-items"
import type { StorefrontOrderPaymentProps } from "@harness-monorepo/ui/blocks/storefront/storefront-order-payment"
import type { StorefrontOrderStatusProps } from "@harness-monorepo/ui/blocks/storefront/storefront-order-status"
import type { StorefrontOrderTrackingProps } from "@harness-monorepo/ui/blocks/storefront/storefront-order-tracking"

// UI
import { feeLineOf, orderTotalText } from "@harness-monorepo/ui/lib/order-total"
import { formatCents } from "@harness-monorepo/ui/blocks/storefront/storefront-price"
import { format } from "@harness-monorepo/ui/locales/index"

// App
import { zipCodeOf } from "./customer-address"
import { momentOf, orderStatusLineOf, type OrderCardContext } from "./order-card-view"
import { estimateLineOf } from "./order-estimate"
import { orderStepsOf } from "./order-steps"
import { reviewHrefOf } from "./review-view"

const ZONE = "America/Sao_Paulo"

/**
 * The shop as an order names it. Only its name: the public shop carries no address — it is kept out
 * of what a search engine indexes — so a pick-up says where only once the shop decides to tell.
 */
export interface OrderShop {
  name: string
}

/** "21 de set. de 2026, 14:02": a moment with its year, for the top of a page and a receipt. */
export function fullMomentOf(iso: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: ZONE }).format(new Date(iso))
}

/** When it reached the status it is in: the last event of that status, or its placing. */
function statusAtOf(order: CustomerOrder): string {
  return order.events.findLast((event) => event.status === order.status)?.at ?? order.placedAt
}

/** Who placed it and when, as the top of the page says it. */
export function orderPlacedLineOf(order: CustomerOrder, { locale, messages }: Pick<OrderCardContext, "locale" | "messages">): string {
  const text = messages.storefront
  return format(order.placedBy === "CUSTOMER" ? text.orderPlacedByYou : text.orderPlacedByShop, { date: fullMomentOf(order.placedAt, locale) })
}

/** The window the shop told for a delivery, both days of it; null until then. */
export function estimateOf(order: Pick<CustomerOrder, "delivery">): { from: string; to: string } | null {
  const delivery = order.delivery
  return delivery?.estimateFrom && delivery.estimateTo ? { from: delivery.estimateFrom, to: delivery.estimateTo } : null
}

/**
 * Where it stands: the list card's words, then when it should arrive — once the shop told — or when
 * it last moved; cancelled, by whom. And its steps.
 */
export function orderStatusViewOf(order: CustomerOrder, context: OrderCardContext): Omit<StorefrontOrderStatusProps, "messages" | "tracking"> {
  const text = context.messages.storefront
  const statusAt = statusAtOf(order)
  const { headline, tone } = orderStatusLineOf({ ...order, statusAt }, context)

  if (order.status === "CANCELLED") {
    return { headline, detail: order.cancelledBy === "CUSTOMER" ? text.orderCancelledByYou : text.orderCancelledByShop, tone, steps: null }
  }
  const estimate = estimateOf(order)
  // Received is the placing itself, already at the top: what it waits for says more than when.
  const detail =
    order.status === "RECEIVED"
      ? text.orderReceivedHint
      : order.status === "DELIVERED"
        ? null
        : estimate
          ? estimateLineOf(estimate, context.locale, context.messages)
          : format(text.orderUpdatedAt, { date: momentOf(statusAt, context.locale) })
  return { headline, detail, tone, steps: orderStepsOf(order, context) }
}

/**
 * How the delivery comes, once the shop told something to follow it by — a carrier, a code, a link.
 * A cancelled order has nothing left to follow.
 */
export function orderTrackingOf(order: CustomerOrder, { messages }: Pick<OrderCardContext, "messages">): Omit<StorefrontOrderTrackingProps, "messages"> | null {
  const delivery = order.delivery
  if (!delivery || order.status === "CANCELLED" || !(delivery.carrier || delivery.trackingCode || delivery.trackingUrl)) return null

  const text = messages.storefront
  const carrier = delivery.kind === "CARRIER"
  const by = carrier ? [delivery.carrier ?? messages.orders.detail.deliveryKinds.CARRIER, delivery.service].filter(Boolean).join(" · ") : text.orderTrackingOwn
  return { by, code: delivery.trackingCode, href: delivery.trackingUrl, hrefLabel: carrier ? text.orderTrackingCarrierLink : text.orderTrackingOwnLink }
}

/** An event's name, in the steps' words; a pick-up marked out for delivery is ready to be taken. */
function eventTitleOf(status: OrderStatus, first: boolean, pickup: boolean, text: OrderCardContext["messages"]["storefront"]): string {
  switch (status) {
    // Placed once: a later "received" is the shop sending it back to waiting.
    case "RECEIVED":
      return first ? text.orderStepPlaced : text.orderStatusReceived
    case "ACCEPTED":
      return text.orderStepAccepted
    case "PREPARING":
      return text.orderStepPreparing
    case "OUT_FOR_DELIVERY":
      return pickup ? text.orderEventReadyForPickup : text.orderStepOut
    case "DELIVERED":
      return pickup ? text.orderStepPickedUp : text.orderStepDelivered
    case "CANCELLED":
      return text.orderEventCancelled
  }
}

/** Every change, most recent first. The first says who placed the order, and a cancel by whom. */
export function orderHistoryOf(order: CustomerOrder, { locale, messages }: Pick<OrderCardContext, "locale" | "messages">): StorefrontOrderHistoryEvent[] {
  const text = messages.storefront
  const pickup = order.fulfillment === "PICKUP"
  const day = new Intl.DateTimeFormat(locale, { day: "numeric", month: "short", timeZone: ZONE })
  const time = new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit", timeZone: ZONE })
  const events = order.events.length ? order.events : [{ status: order.status, at: order.placedAt }]

  return events
    .map((event, index) => ({
      day: day.format(new Date(event.at)),
      time: time.format(new Date(event.at)),
      title: eventTitleOf(event.status, index === 0, pickup, text),
      detail:
        index === 0
          ? order.placedBy === "CUSTOMER"
            ? text.orderEventPlacedByYou
            : text.orderEventPlacedByShop
          : event.status === "CANCELLED"
            ? order.cancelledBy === "CUSTOMER"
              ? text.orderEventByYou
              : text.orderEventByShop
            : null,
    }))
    .reverse()
}

/** The lines at the prices of the day, and how many units they add up to. */
export function orderItemsOf(order: CustomerOrder, { routes, locale, messages }: OrderCardContext): { items: StorefrontOrderItemLine[]; count: number } {
  const text = messages.storefront
  const items = order.items.map((item) => ({
    name: item.productName,
    href: item.productSlug ? routes.product(item.productSlug) : null,
    imageUrl: item.imageUrl,
    meta: [
      item.variantLabel,
      format(text.orderQty, { qty: String(item.quantity) }),
      item.quantity > 1 ? format(text.orderEach, { price: formatCents(item.unitPriceCents, locale, "BRL") }) : null,
    ]
      .filter(Boolean)
      .join(" · "),
    price: formatCents(item.lineTotalCents, locale, "BRL"),
    // Delivered, and still on sale: the line leads to its rating (J18).
    reviewHref: order.status === "DELIVERED" && item.productId && item.productSlug ? reviewHrefOf(routes, item.productId) : null,
  }))
  return { items, count: order.items.reduce((sum, item) => sum + item.quantity, 0) }
}

/** The sums that apply — delivery only on a delivery, a discount only when there is one — and the way of paying agreed. */
export function orderPaymentOf(order: CustomerOrder, { locale, messages }: Pick<OrderCardContext, "locale" | "messages">): Omit<StorefrontOrderPaymentProps, "messages"> {
  const text = messages.storefront
  const money = (cents: number) => formatCents(cents, locale, "BRL")
  const fee = feeLineOf(order)
  const rows: StorefrontOrderPaymentProps["rows"] = [
    { label: text.orderSubtotal, value: money(order.subtotalCents) },
    ...(fee === null
      ? []
      : [
          fee === "toAgree"
            ? { label: text.orderDelivery, value: text.orderFeeToAgree }
            : fee.cents === 0
              ? { label: text.orderDelivery, value: text.orderFree, positive: true }
              : { label: text.orderDelivery, value: money(fee.cents) },
        ]),
    ...(order.discountCents > 0 ? [{ label: text.orderDiscount, value: `− ${money(order.discountCents)}`, positive: true }] : []),
  ]
  return { rows, total: orderTotalText(money(order.totalCents), order, text.orderTotalPlusFee), method: format(text.orderPaymentAgreed, { method: messages.orders.payments[order.paymentMethod] }) }
}

/** Where it goes — who receives it, then the address line by line — or the shop it is picked up at. Null for a delivery that recorded none. */
export function orderHandoverOf(order: CustomerOrder, shop: OrderShop, { messages }: Pick<OrderCardContext, "messages">): StorefrontOrderAddressProps | null {
  const text = messages.storefront
  if (order.fulfillment === "PICKUP") return { title: text.orderPickupLabel, lines: [shop.name] }

  const address = order.deliveryAddress
  if (!address) return null
  const street = [address.street, address.number, address.complement].filter(Boolean).join(", ")
  const place = [address.city, address.state].filter(Boolean).join("/")
  const zip = zipCodeOf(address.zipCode)
  const area = [address.neighborhood, place, zip ? `CEP ${zip}` : null].filter(Boolean).join(" — ")
  return { title: text.accountAddress, lines: [address.recipientName, street, area].filter(Boolean) }
}
