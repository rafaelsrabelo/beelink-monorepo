// Types
import type { CustomerOrderSummary } from "@harness-monorepo/contracts"
import type { StorefrontOrderCardProps } from "@harness-monorepo/ui/blocks/storefront/storefront-order-card"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// UI
import { formatCents } from "@harness-monorepo/ui/blocks/storefront/storefront-price"
import { format } from "@harness-monorepo/ui/locales/index"

// App
import type { StorefrontRoutes } from "./storefront-routes"
import { estimateLineOf } from "./order-estimate"

export interface OrderCardContext {
  routes: StorefrontRoutes
  locale: string
  messages: UiMessages
}

/** "21 de set. de 2026", as the card's header writes a day. */
export function dayOf(iso: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, { day: "numeric", month: "short", year: "numeric", timeZone: "America/Sao_Paulo" }).format(new Date(iso))
}

/** "21 de set., 14:02", as the status lines write a moment. */
export function momentOf(iso: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" }).format(new Date(iso))
}

/** Whether an order is on its way, and so worth following: received to out for delivery. */
export function isOrderInProgress(status: CustomerOrderSummary["status"]): boolean {
  return status !== "DELIVERED" && status !== "CANCELLED"
}

/**
 * What a shopper can do with an order besides following it: cancel it while the shop has not
 * accepted it (J2), buy it again once it ended (J6), and nothing while it is on its way.
 */
export function orderActionOf(status: CustomerOrderSummary["status"]): "cancel" | "reorder" | null {
  if (status === "RECEIVED") return "cancel"
  return isOrderInProgress(status) ? null : "reorder"
}

/**
 * Where the order stands, in the shopper's words, and what to say under it: once the shop told the
 * window a delivery should arrive in, that — "Chega entre …" — is what a shopper looks for first.
 */
export function orderStatusLineOf(
  order: Pick<CustomerOrderSummary, "status" | "fulfillment" | "placedBy" | "cancelledBy" | "placedAt" | "statusAt"> & { estimate?: CustomerOrderSummary["estimate"] },
  { locale, messages }: Pick<OrderCardContext, "locale" | "messages">,
): Pick<StorefrontOrderCardProps, "headline" | "detail" | "tone"> {
  const text = messages.storefront
  const placed = format(order.placedBy === "CUSTOMER" ? text.orderPlacedByYou : text.orderPlacedByShop, { date: momentOf(order.placedAt, locale) })
  const pickup = order.fulfillment === "PICKUP"
  const onItsWay = order.estimate ? estimateLineOf(order.estimate, locale, messages) : placed

  switch (order.status) {
    case "RECEIVED":
      return { headline: text.orderStatusReceived, detail: `${placed} ${text.orderReceivedHint}`, tone: "progress" }
    case "ACCEPTED":
      return { headline: text.orderStatusAccepted, detail: onItsWay, tone: "progress" }
    case "PREPARING":
      return { headline: text.orderStatusPreparing, detail: onItsWay, tone: "progress" }
    // The panel sets any status: on a pick-up, out for delivery can only mean ready to be taken.
    case "OUT_FOR_DELIVERY":
      return { headline: pickup ? text.orderEventReadyForPickup : text.orderStatusOut, detail: onItsWay, tone: "progress" }
    case "DELIVERED":
      return { headline: format(pickup ? text.orderStatusPickedUp : text.orderStatusDelivered, { date: dayOf(order.statusAt, locale) }), detail: placed, tone: "done" }
    case "CANCELLED":
      return {
        headline: format(text.orderStatusCancelled, { date: dayOf(order.statusAt, locale) }),
        detail: `${order.cancelledBy === "CUSTOMER" ? text.orderCancelledByYou : text.orderCancelledByShop} · ${placed}`,
        tone: "cancelled",
      }
  }
}

/** The card's words, from the order as the API tells it: the block itself formats nothing. */
export function orderCardViewOf(order: CustomerOrderSummary, context: OrderCardContext): Omit<StorefrontOrderCardProps, "actions" | "linkComponent" | "messages"> {
  const { routes, locale, messages } = context
  const text = messages.storefront

  return {
    number: order.number,
    placedOn: dayOf(order.placedAt, locale),
    total: `${formatCents(order.totalCents, locale, "BRL")} · ${messages.orders.payments[order.paymentMethod]}`,
    shipTo: order.fulfillment === "PICKUP" ? text.orderPickupLabel : order.recipientName,
    ...orderStatusLineOf(order, context),
    items: order.items.map((item) => ({
      name: item.productName,
      href: item.productSlug ? routes.product(item.productSlug) : null,
      imageUrl: item.imageUrl,
      meta: [item.variantLabel, format(text.orderQty, { qty: String(item.quantity) })].filter(Boolean).join(" · "),
    })),
    moreItems: order.moreItems,
  }
}
