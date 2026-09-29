"use client"

// Types
import type { StorefrontRouteWords } from "@harness-monorepo/contracts"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// App
import { ConversationListLive } from "./conversation-list-live"
import { ConversationThreadLive } from "./conversation-thread-live"

export interface ShopperConversationsProps {
  slug: string
  routeWords: StorefrontRouteWords
  /** The order whose conversation shows; null shows the list. */
  order: number | null
  onSelect: (number: number) => void
  onBack: () => void
  messages: UiMessages
}

/** The conversations: the list, or one of them with the way back to it. The panel and the tab both draw this. */
export function ShopperConversations({ slug, routeWords, order, onSelect, onBack, messages }: ShopperConversationsProps) {
  if (order !== null) return <ConversationThreadLive key={order} slug={slug} routeWords={routeWords} number={order} onBack={onBack} messages={messages} />
  return <ConversationListLive slug={slug} routeWords={routeWords} onSelect={onSelect} messages={messages} />
}
