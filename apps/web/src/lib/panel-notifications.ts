// Types
import type { OrderPage, RealtimeEvent, ShopConversationPage, ShopConversationUnread } from "@harness-monorepo/contracts"
import type { AdminNotification } from "@harness-monorepo/ui/blocks/admin/admin-notifications"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// UI
import { orderTotalText } from "@harness-monorepo/ui/lib/order-total"
import { format } from "@harness-monorepo/ui/locales/index"

// App
import { momentOf } from "./order-card-view"

/** As many as the bell's menu shows: the latest, whichever kind. */
export const NOTIFICATIONS_SHOWN = 8

/** Where an order opens in the panel; a message leads there too until the Conversas tab (K5). */
export function panelOrderHrefOf(slug: string, number: number): string {
  return `/admin/${slug}/orders/${number}`
}

/** The new orders, filtered: where "Ver pedidos novos" leads. */
export function panelNewOrdersHrefOf(slug: string): string {
  return `/admin/${slug}/orders?status=RECEIVED`
}

/** What the bell counts: messages from customers not read, and orders nobody accepted yet. */
export function notificationCountOf(unread: ShopConversationUnread | undefined, received: OrderPage | undefined): number {
  return (unread?.messages ?? 0) + (received?.total ?? 0)
}

interface NotificationContext {
  slug: string
  locale: string
  messages: UiMessages
}

/** The bell's menu: new orders and unread conversations, most recent first. */
export function notificationsOf(received: OrderPage | undefined, unread: ShopConversationPage | undefined, { slug, locale, messages }: NotificationContext): AdminNotification[] {
  const text = messages.shell
  const money = new Intl.NumberFormat(locale, { style: "currency", currency: "BRL" })
  const orders = (received?.orders ?? []).map((order) => ({
    at: order.placedAt,
    item: {
      id: `order-${order.number}`,
      kind: "order" as const,
      title: format(text.notificationNewOrder, { number: String(order.number) }),
      detail: format(text.notificationOrderDetail, { customer: order.customer.name, total: orderTotalText(money.format(order.totalCents / 100), order, messages.orders.totalPlusFee) }),
      when: momentOf(order.placedAt, locale),
      href: panelOrderHrefOf(slug, order.number),
    },
  }))
  const conversations = (unread?.conversations ?? []).map((row) => ({
    at: row.lastMessage.createdAt,
    item: {
      id: `message-${row.order.number}`,
      kind: "message" as const,
      title: format(text.notificationNewMessage, { number: String(row.order.number) }),
      // The last line may be the shop's own reply or the order's move, with the customer's still unread: then only who.
      detail:
        row.lastMessage.kind === "MESSAGE" && row.lastMessage.author === "CUSTOMER"
          ? format(text.notificationMessageDetail, { customer: row.customer.name, body: row.lastMessage.body.replace(/\s+/g, " ").trim() })
          : row.customer.name,
      when: momentOf(row.lastMessage.createdAt, locale),
      href: panelOrderHrefOf(slug, row.order.number),
    },
  }))
  return [...orders, ...conversations]
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, NOTIFICATIONS_SHOWN)
    .map(({ item }) => item)
}

/** What a toast says of an event, or null for what the shop did itself and for what is not news. */
export function toastOf(event: RealtimeEvent, messages: UiMessages): string | null {
  const text = messages.shell
  if (event.type === "order.created" && event.placedBy === "CUSTOMER") return format(text.notificationNewOrder, { number: String(event.orderNumber) })
  if (event.type === "conversation.message" && event.author === "CUSTOMER") return format(text.notificationNewMessage, { number: String(event.orderNumber) })
  // Money the order did not ask for (BEELINK-206): nothing is refunded by itself, so the shop is told at once.
  if (event.type === "order.payment" && event.stray === "ORDER_CANCELLED") return format(text.notificationStrayCancelled, { number: String(event.orderNumber) })
  if (event.type === "order.payment" && event.stray === "ORDER_ALREADY_PAID") return format(text.notificationStrayDuplicate, { number: String(event.orderNumber) })
  return null
}

/** The tab's title with the count in front, or without it at none; any count already there is replaced. */
export function titledWith(title: string, count: number): string {
  const bare = title.replace(/^\(\d+\+?\) /, "")
  return count > 0 ? `(${count > 99 ? "99+" : count}) ${bare}` : bare
}
