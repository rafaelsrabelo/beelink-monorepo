// Types
import type { CustomerConversation, CustomerConversationSummary } from "@harness-monorepo/contracts"
import type { StorefrontConversationRow } from "@harness-monorepo/ui/blocks/storefront/storefront-conversation-list"
import type { StorefrontConversationLine } from "@harness-monorepo/ui/blocks/storefront/storefront-conversation-thread"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// UI
import { format } from "@harness-monorepo/ui/locales/index"

// App
import { momentOf } from "./order-card-view"
import { statusNoticeKeyOf } from "./status-notice"
import type { StorefrontRoutes } from "./storefront-routes"

// One limit for both sides of a conversation: the shopper's here, the shop's in the panel.
export { MESSAGE_MAX, messageLengthOf } from "./message-length"

interface ConversationContext {
  locale: string
  messages: UiMessages
}

/** A delivery's notice with the cashback it made usable (BEELINK-239), in the reader's money: one sentence of the copy's, which owns the punctuation between them. */
export function noticeWithCashback(notice: string, cashbackCents: number | null, cashbackText: string, locale: string): string {
  if (!cashbackCents) return notice
  const amount = new Intl.NumberFormat(locale, { style: "currency", currency: "BRL" }).format(cashbackCents / 100)
  return format(cashbackText, { notice, amount })
}

/** The list's rows, in the API's order: those still taking messages first. */
export function conversationRowsOf(summaries: readonly CustomerConversationSummary[], { routes, locale, messages }: ConversationContext & { routes: StorefrontRoutes }): StorefrontConversationRow[] {
  const text = messages.storefront
  return summaries.map(({ order, lastMessage, unread }) => {
    // One line in a list: a message's own line breaks would only be cut.
    const body = lastMessage.kind === "MESSAGE" ? lastMessage.body.replace(/\s+/g, " ").trim() : ""
    return {
      number: order.number,
      title: format(text.orderNumber, { number: String(order.number) }),
      preview:
        lastMessage.kind === "STATUS"
          ? text.conversationNotices[statusNoticeKeyOf(lastMessage.status, order.fulfillment)]
          : lastMessage.author === "CUSTOMER"
            ? format(text.conversationYouSaid, { body })
            : body,
      when: momentOf(lastMessage.createdAt, locale),
      unread,
      closed: !order.open,
      href: routes.accountConversation(order.number),
    }
  })
}

/** Every message and notice, oldest first; the shopper's last message says whether the shop has read it. */
export function conversationLinesOf(conversation: CustomerConversation, { locale, messages }: ConversationContext): StorefrontConversationLine[] {
  const text = messages.storefront
  const lastMine = conversation.messages.findLastIndex((message) => message.kind === "MESSAGE" && message.author === "CUSTOMER")
  return conversation.messages.map((message, index) =>
    message.kind === "STATUS"
      ? {
          id: message.id,
          mine: false,
          notice: true,
          body: noticeWithCashback(text.conversationNotices[statusNoticeKeyOf(message.status, conversation.order.fulfillment)], message.cashbackCents, text.conversationCashback, locale),
          when: momentOf(message.createdAt, locale),
        }
      : {
          id: message.id,
          mine: message.author === "CUSTOMER",
          body: message.body,
          when: momentOf(message.createdAt, locale),
          seen: index === lastMine ? (message.readAt ? text.conversationRead : text.conversationSent) : null,
        },
  )
}

/** What the header's balloon counts: the shop's messages and the order's moves not read yet, across every conversation. */
export function unreadOf(summaries: readonly CustomerConversationSummary[] | undefined): number {
  return (summaries ?? []).reduce((total, summary) => total + summary.unread, 0)
}
