"use client"

// Types
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// UI
import { StorefrontOrderTalk, type StorefrontOrderTalkProps } from "@harness-monorepo/ui/blocks/storefront/storefront-order-talk"

// App
import { AppLink } from "@/components/app-link"
import { useConversationPanel } from "@/stores/conversation-panel"

export interface OrderTalkLiveProps {
  number: number
  /** The order's conversation on its own page: `routes.accountConversation(number)`. */
  href: string
  size?: StorefrontOrderTalkProps["size"]
  messages: UiMessages
}

/**
 * "Falar com a loja" on an order on its way. With the header's panel on the page it opens the
 * order's conversation there; without one, it is the link it always is, to the conversation's page.
 */
export function OrderTalkLive({ number, href, size, messages }: OrderTalkLiveProps) {
  const show = useConversationPanel((state) => state.show)
  const hasPanel = useConversationPanel((state) => state.panels > 0)

  return <StorefrontOrderTalk href={href} {...(hasPanel ? { onOpen: () => show(number) } : {})} {...(size ? { size } : {})} linkComponent={AppLink} messages={messages} />
}
