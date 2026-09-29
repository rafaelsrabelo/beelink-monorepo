"use client"

// Types
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// UI
import { StorefrontOrderCancelledNotice } from "@harness-monorepo/ui/blocks/storefront/storefront-order-cancelled-notice"

// App
import { useOrderCancelNotice } from "./order-cancel-notice"

/** "Pedido nº N cancelado.", where the screen places it: over the list, or under an order's top. */
export function OrderCancelNoticeLine({ messages }: { messages: UiMessages }) {
  const notice = useOrderCancelNotice()
  if (!notice) return null

  return <StorefrontOrderCancelledNotice ref={notice.region} number={notice.cancelled} messages={messages} />
}
