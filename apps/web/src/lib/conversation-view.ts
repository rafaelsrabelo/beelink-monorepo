// Types
import type { CustomerConversation, CustomerConversationSummary } from "@harness-monorepo/contracts"
import type { StorefrontConversationRow } from "@harness-monorepo/ui/blocks/storefront/storefront-conversation-list"
import type { StorefrontConversationLine } from "@harness-monorepo/ui/blocks/storefront/storefront-conversation-thread"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// UI
import { format } from "@harness-monorepo/ui/locales/index"

// App
import { momentOf } from "./order-card-view"
import type { StorefrontRoutes } from "./storefront-routes"

/** The API's limit, counted as the database counts it: in code points, so an emoji is one. */
export const MESSAGE_MAX = 2000

interface ConversationContext {
  locale: string
  messages: UiMessages
}

/** The list's rows, in the API's order: those still taking messages first. */
export function conversationRowsOf(summaries: readonly CustomerConversationSummary[], { routes, locale, messages }: ConversationContext & { routes: StorefrontRoutes }): StorefrontConversationRow[] {
  const text = messages.storefront
  return summaries.map(({ order, lastMessage, unread }) => {
    // One line in a list: a message's own line breaks would only be cut.
    const body = lastMessage.body.replace(/\s+/g, " ").trim()
    return {
      number: order.number,
      title: format(text.orderNumber, { number: String(order.number) }),
      preview: lastMessage.author === "CUSTOMER" ? format(text.conversationYouSaid, { body }) : body,
      when: momentOf(lastMessage.createdAt, locale),
      unread,
      closed: !order.open,
      href: routes.accountConversation(order.number),
    }
  })
}

/** Every message, oldest first; the shopper's last one says whether the shop has read it. */
export function conversationLinesOf(conversation: CustomerConversation, { locale, messages }: ConversationContext): StorefrontConversationLine[] {
  const text = messages.storefront
  const lastMine = conversation.messages.findLastIndex((message) => message.author === "CUSTOMER")
  return conversation.messages.map((message, index) => ({
    id: message.id,
    mine: message.author === "CUSTOMER",
    body: message.body,
    when: momentOf(message.createdAt, locale),
    seen: index === lastMine ? (message.readAt ? text.conversationRead : text.conversationSent) : null,
  }))
}

/** What the header's balloon counts: the shop's messages not read yet, across every conversation. */
export function unreadOf(summaries: readonly CustomerConversationSummary[] | undefined): number {
  return (summaries ?? []).reduce((total, summary) => total + summary.unread, 0)
}

/** How long a draft is as the API measures it: trimmed, in code points. */
export function messageLengthOf(draft: string): number {
  return [...draft.trim()].length
}
