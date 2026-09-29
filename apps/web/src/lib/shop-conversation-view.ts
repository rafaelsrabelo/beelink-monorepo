// Types
import type { ShopConversation, ShopConversationFilter, ShopConversationPage } from "@harness-monorepo/contracts"
import type { ConversationLine } from "@harness-monorepo/ui/blocks/conversations/conversation-thread"
import type { ConversationListRow } from "@harness-monorepo/ui/blocks/conversations/conversation-list"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// UI
import { format } from "@harness-monorepo/ui/locales/index"

// App
import { momentOf } from "./order-card-view"
import { statusNoticeKeyOf } from "./status-notice"

/** What the conversations' tab reads from its address: which filter, the search, and the one open. */
export interface ShopConversationsAddress {
  filter: ShopConversationFilter
  q: string
  order: number | null
  page: number
}

/** The API refuses a longer search; cut here, so an address never asks what can only fail. */
export const SEARCH_MAX = 120

const FILTERS: readonly ShopConversationFilter[] = ["OPEN", "UNREAD", "ALL"]

/** The tab's state from its query; an unknown filter reads as the default, open ones. */
export function shopConversationsAddressOf(params: URLSearchParams): ShopConversationsAddress {
  const filter = params.get("filtro")?.toUpperCase()
  const order = Number(params.get("pedido"))
  const page = Number(params.get("pagina"))
  return {
    filter: FILTERS.includes(filter as ShopConversationFilter) ? (filter as ShopConversationFilter) : "OPEN",
    q: [...(params.get("q")?.trim() ?? "")].slice(0, SEARCH_MAX).join(""),
    order: Number.isInteger(order) && order > 0 ? order : null,
    page: Number.isInteger(page) && page > 1 ? page : 1,
  }
}

/** The tab's address for a state: each filter, search and open conversation is a link of its own. */
export function shopConversationsHrefOf(slug: string, { filter, q, order, page }: ShopConversationsAddress): string {
  const query = new URLSearchParams()
  if (filter !== "OPEN") query.set("filtro", filter.toLowerCase())
  if (q) query.set("q", q)
  if (page > 1) query.set("pagina", String(page))
  if (order !== null) query.set("pedido", String(order))
  return `/admin/${slug}/conversations${query.size ? `?${query.toString()}` : ""}`
}

interface ViewContext {
  locale: string
  messages: UiMessages
}

/** The list's rows, in the API's order: latest message first. */
export function shopConversationRowsOf(page: ShopConversationPage, address: ShopConversationsAddress, slug: string, { locale, messages }: ViewContext): ConversationListRow[] {
  const text = messages.conversations
  return page.conversations.map(({ order, customer, lastMessage, unread }) => {
    const body = lastMessage.kind === "MESSAGE" ? lastMessage.body.replace(/\s+/g, " ").trim() : ""
    return {
      number: order.number,
      customer: customer.name,
      order: `${format(text.orderLine, { number: String(order.number) })} · ${messages.orders.statuses[order.status]}`,
      preview:
        lastMessage.kind === "STATUS"
          ? text.notices[statusNoticeKeyOf(lastMessage.status, order.fulfillment)]
          : lastMessage.author === "SHOP"
            ? format(text.youSaid, { body })
            : body,
      when: momentOf(lastMessage.createdAt, locale),
      unread,
      closed: !order.open,
      href: shopConversationsHrefOf(slug, { ...address, order: order.number }),
    }
  })
}

/** Every message and notice, oldest first; the shop's last message says whether the customer has read it. */
export function shopConversationLinesOf(conversation: ShopConversation, { locale, messages }: ViewContext): ConversationLine[] {
  const text = messages.conversations
  const lastMine = conversation.messages.findLastIndex((message) => message.kind === "MESSAGE" && message.author === "SHOP")
  return conversation.messages.map((message, index) =>
    message.kind === "STATUS"
      ? {
          id: message.id,
          mine: false,
          notice: true,
          body: text.notices[statusNoticeKeyOf(message.status, conversation.order.fulfillment)],
          when: momentOf(message.createdAt, locale),
        }
      : {
          id: message.id,
          mine: message.author === "SHOP",
          body: message.body,
          when: momentOf(message.createdAt, locale),
          seen: index === lastMine ? (message.readAt ? text.read : text.sent) : null,
        },
  )
}

/**
 * Open, closed, or none at all — an order has a conversation from its first status when its customer
 * has an account to read it (BEELINK-236); "empty" is one who has none.
 */
export function shopConversationStateOf(conversation: ShopConversation): "open" | "closed" | "empty" | "none" {
  if (conversation.messages.length === 0) return conversation.order.open ? "empty" : "none"
  return conversation.order.open ? "open" : "closed"
}
