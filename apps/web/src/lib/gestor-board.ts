// Types
import type { OrderSummary } from "@harness-monorepo/contracts"
import type { GestorCardView, GestorColumns, GestorPaymentTone } from "@harness-monorepo/ui/blocks/gestor/gestor-board"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// UI
import { formatCents } from "@harness-monorepo/ui/blocks/storefront/storefront-price"
import { orderPaymentStateOf } from "@harness-monorepo/ui/lib/order-payment"
import { orderTotalText } from "@harness-monorepo/ui/lib/order-total"
import { format } from "@harness-monorepo/ui/locales/index"

/** How often the open orders are asked for besides the channel: an order the channel missed still rings. */
export const WAITING_EVERY_MS = 30_000

/** The opened order's tab, as the address names it. */
export type GestorOrderTab = "pedido" | "conversa"

/** The manager's own addresses: its board, and an order opened beside it — on its conversation, if asked. */
export const gestorHrefOf = (slug: string) => `/admin/${slug}/gestor`
export const gestorCouponsHrefOf = (slug: string) => `/admin/${slug}/gestor/cupons`
export const gestorConversationsHrefOf = (slug: string) => `/admin/${slug}/gestor/conversas`
export function gestorOrderHrefOf(slug: string, number: number, tab: GestorOrderTab = "pedido"): string {
  return `${gestorHrefOf(slug)}?pedido=${number}${tab === "conversa" ? "&aba=conversa" : ""}`
}

interface BoardContext {
  slug: string
  locale: string
  messages: UiMessages
  now: Date
}

const MINUTE = 60_000

/** "agora", "há 3 min.", "há 2 h": how long an order has waited, which is what the counter reads. */
export function ageOf(iso: string, now: Date, locale: string): string {
  const minutes = Math.max(0, Math.floor((now.getTime() - new Date(iso).getTime()) / MINUTE))
  const words = new Intl.RelativeTimeFormat(locale, { numeric: "auto", style: "short" })
  if (minutes === 0) return words.format(0, "second")
  return minutes < 60 ? words.format(-minutes, "minute") : words.format(-Math.floor(minutes / 60), "hour")
}

/**
 * Where the card's money stands. Paid online is paid; settled with the shop — cash, a card machine
 * — is still to be paid while the order is on the shop's hands, since bee-link never learns it was.
 */
function paymentOf(order: OrderSummary, messages: UiMessages): { payment: string; paymentTone: GestorPaymentTone } {
  const way = messages.orders.payments[order.paymentMethod]
  const state = orderPaymentStateOf(order)
  if (state === "paid") return { payment: `${way} · ${messages.orders.paymentStates.paid}`, paymentTone: "paid" }
  if (state === "awaiting") return { payment: `${way} · ${messages.orders.paymentStates.awaiting}`, paymentTone: "due" }
  if (state) return { payment: `${way} · ${messages.orders.paymentStates[state]}`, paymentTone: "neutral" }
  return { payment: way, paymentTone: order.status === "DELIVERED" ? "neutral" : "due" }
}

export function gestorCardOf(order: OrderSummary, { slug, locale, messages, now }: BoardContext): GestorCardView {
  const text = messages.gestor.board
  return {
    number: order.number,
    customer: order.customer.name,
    age: ageOf(order.placedAt, now, locale),
    total: orderTotalText(formatCents(order.totalCents, locale, "BRL"), order, messages.orders.totalPlusFee),
    items: order.itemsCount === 1 ? text.itemsOne : format(text.itemsMany, { count: String(order.itemsCount) }),
    fulfillment: order.fulfillment,
    fulfillmentLabel: messages.orders.fulfillments[order.fulfillment],
    ...paymentOf(order, messages),
    href: gestorOrderHrefOf(slug, order.number),
  }
}

/**
 * The board from two reads: the open orders, and the last ones delivered. A column is a queue, so
 * it runs oldest first; the API lists the latest first. A pick-up ready at the shop is out of the
 * kitchen the same way a delivery on its way is, and stands with it.
 */
export function gestorColumnsOf(open: readonly OrderSummary[], done: readonly OrderSummary[], context: BoardContext): GestorColumns {
  const queue = [...open].reverse()
  const cards = (statuses: readonly OrderSummary["status"][]) => queue.filter((order) => statuses.includes(order.status)).map((order) => gestorCardOf(order, context))
  return {
    NEW: cards(["RECEIVED"]),
    PREPARING: cards(["ACCEPTED", "PREPARING"]),
    ON_THE_WAY: cards(["OUT_FOR_DELIVERY"]),
    DONE: done.map((order) => gestorCardOf(order, context)),
  }
}
