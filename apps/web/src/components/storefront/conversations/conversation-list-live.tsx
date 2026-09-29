"use client"

// Types
import type { StorefrontRouteWords } from "@harness-monorepo/contracts"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// UI
import { StorefrontConversationFailed } from "@harness-monorepo/ui/blocks/storefront/storefront-conversation-failed"
import { StorefrontConversationList } from "@harness-monorepo/ui/blocks/storefront/storefront-conversation-list"
import { StorefrontConversationListSkeleton } from "@harness-monorepo/ui/blocks/storefront/storefront-conversation-list-skeleton"

// App
import { AppLink } from "@/components/app-link"
import { conversationRowsOf } from "@/lib/conversation-view"
import { storefrontRoutes } from "@/lib/storefront-routes"
import { useShopperConversations } from "@/services/conversations/conversation-hooks"

export interface ConversationListLiveProps {
  slug: string
  routeWords: StorefrontRouteWords
  /** Opens one in place; each row is still a link to its own page. */
  onSelect?: (number: number) => void
  messages: UiMessages
}

/** The shopper's conversations at the shop, read live: every event on the channel reads them again. */
export function ConversationListLive({ slug, routeWords, onSelect, messages }: ConversationListLiveProps) {
  const list = useShopperConversations(slug)

  if (list.isPending) return <StorefrontConversationListSkeleton />
  if (list.isError) return <StorefrontConversationFailed message={messages.storefront.conversationsFailed} onRetry={() => void list.refetch()} messages={messages} />

  const rows = conversationRowsOf(list.data, { routes: storefrontRoutes({ slug, routeWords }), locale: "pt-BR", messages })
  return <StorefrontConversationList rows={rows} {...(onSelect ? { onSelect } : {})} linkComponent={AppLink} messages={messages} />
}
