"use client"

// React
import { useState } from "react"

// Types
import type { StorefrontRouteWords } from "@harness-monorepo/contracts"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// App
import { ShopperConversations } from "./shopper-conversations"

export interface AccountConversationsProps {
  slug: string
  routeWords: StorefrontRouteWords
  /** The order the address named (`?pedido=`), whose conversation opens first. */
  initialOrder: number | null
  messages: UiMessages
}

/**
 * The conversations' own tab: the list, and one of them in its place, as the panel draws them. The
 * height is bounded, so a long conversation scrolls inside and the composer stays in sight.
 */
export function AccountConversations({ slug, routeWords, initialOrder, messages }: AccountConversationsProps) {
  const [order, setOrder] = useState(initialOrder)

  return (
    <div className="flex h-[min(70svh,640px)] flex-col rounded-2xl border border-shop-line bg-shop-background p-4 shop-md:p-5">
      <ShopperConversations slug={slug} routeWords={routeWords} order={order} onSelect={setOrder} onBack={() => setOrder(null)} messages={messages} />
    </div>
  )
}
