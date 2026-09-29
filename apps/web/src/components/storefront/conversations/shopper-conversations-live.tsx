"use client"

// React
import { useEffect } from "react"

// Types
import type { StorefrontRouteWords } from "@harness-monorepo/contracts"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// UI
import { StorefrontConversationsLink } from "@harness-monorepo/ui/blocks/storefront/storefront-conversations-link"
import { StorefrontConversationsPanel } from "@harness-monorepo/ui/blocks/storefront/storefront-conversations-panel"

// App
import { AppLink } from "@/components/app-link"
import { figtree, shopFontStyle } from "@/components/storefront/shop-font"
import { unreadOf } from "@/lib/conversation-view"
import { storefrontRoutes } from "@/lib/storefront-routes"
import { useShopperConversations } from "@/services/conversations/conversation-hooks"
import { useConversationPanel } from "@/stores/conversation-panel"
import { ShopperConversations } from "./shopper-conversations"

export interface ShopperConversationsLiveProps {
  slug: string
  routeWords: StorefrontRouteWords
  messages: UiMessages
}

/** The shop's face on a panel a portal carries out of the window: `--font-shop` is set on the layout, not on `body`. */
const panelFont = { ...shopFontStyle, fontFamily: "var(--font-shop)" }

/**
 * The signed-in shopper's conversations in the header: the balloon, once there is a conversation,
 * with the shop's unread messages, and the panel every "Falar com a loja" of the page opens — there
 * even while the balloon is not, since an order on its way has no conversation until its first word.
 */
export function ShopperConversationsLive({ slug, routeWords, messages }: ShopperConversationsLiveProps) {
  const routes = storefrontRoutes({ slug, routeWords })
  const list = useShopperConversations(slug)
  const { open, order, show, back, close, mount } = useConversationPanel()

  useEffect(() => mount(), [mount])

  return (
    <>
      {list.data?.length ? (
        <StorefrontConversationsLink href={routes.accountTab("messages")} unread={unreadOf(list.data)} onOpen={() => show(null)} linkComponent={AppLink} messages={messages} />
      ) : null}
      <StorefrontConversationsPanel open={open} onOpenChange={(next) => (next ? undefined : close())} className={figtree.variable} style={panelFont} messages={messages}>
        {open ? <ShopperConversations slug={slug} routeWords={routeWords} order={order} onSelect={show} onBack={back} messages={messages} /> : null}
      </StorefrontConversationsPanel>
    </>
  )
}
