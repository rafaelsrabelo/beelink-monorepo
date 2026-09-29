// Types
import type { CustomerOrderSummary } from "@harness-monorepo/contracts"
import type { StorefrontOrderCardProps } from "@harness-monorepo/ui/blocks/storefront/storefront-order-card"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// UI
import { formatCents } from "@harness-monorepo/ui/blocks/storefront/storefront-price"
import { format } from "@harness-monorepo/ui/locales/index"

// App
import type { StorefrontRoutes } from "./storefront-routes"

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

/** Where the order stands, in the shopper's words, and what to say under it. */
export function orderStatusLineOf(
  order: Pick<CustomerOrderSummary, "status" | "placedBy" | "cancelledBy" | "placedAt" | "statusAt">,
  { locale, messages }: Pick<OrderCardContext, "locale" | "messages">,
): Pick<StorefrontOrderCardProps, "headline" | "detail" | "tone"> {
  const text = messages.storefront
  const placed = format(order.placedBy === "CUSTOMER" ? text.orderPlacedByYou : text.orderPlacedByShop, { date: momentOf(order.placedAt, locale) })

  switch (order.status) {
    case "RECEIVED":
      return { headline: text.orderStatusReceived, detail: `${placed} ${text.orderReceivedHint}`, tone: "progress" }
    case "ACCEPTED":
      return { headline: text.orderStatusAccepted, detail: placed, tone: "progress" }
    case "PREPARING":
      return { headline: text.orderStatusPreparing, detail: placed, tone: "progress" }
    case "OUT_FOR_DELIVERY":
      return { headline: text.orderStatusOut, detail: placed, tone: "progress" }
    case "DELIVERED":
      return { headline: format(text.orderStatusDelivered, { date: dayOf(order.statusAt, locale) }), detail: placed, tone: "done" }
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
