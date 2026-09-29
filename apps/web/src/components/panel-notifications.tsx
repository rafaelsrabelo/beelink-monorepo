"use client"

// React
import { useEffect } from "react"

// Next
import { usePathname } from "next/navigation"

// UI
import { AdminNotifications } from "@harness-monorepo/ui/blocks/admin/admin-notifications"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// App
import { AppLink } from "@/components/app-link"
import { notificationCountOf, notificationsOf, panelNewOrdersHrefOf, titledWith } from "@/lib/panel-notifications"
import { useShopConversations, useShopUnread } from "@/services/conversations/shop-conversation-hooks"
import { useOrders } from "@/services/orders/order-hooks"

export interface PanelNotificationsProps {
  slug: string
  messages: UiMessages
}

const RECEIVED = { status: "RECEIVED", pageSize: 5 } as const
const UNREAD = { filter: "UNREAD" } as const

/**
 * The panel's bell (BEELINK-163): unread messages and orders nobody accepted yet, counted and listed.
 * Every read here is one the real-time channel reads again at each event, so the count moves on its
 * own; the tab's title carries it too, for a panel left behind another tab.
 */
export function PanelNotifications({ slug, messages }: PanelNotificationsProps) {
  const pathname = usePathname()
  const unread = useShopUnread(slug)
  const received = useOrders(slug, RECEIVED)
  const conversations = useShopConversations(slug, UNREAD)
  const count = notificationCountOf(unread.data, received.data)

  // Again at every page: Next writes each page's own title on the way in.
  useEffect(() => {
    document.title = titledWith(document.title, count)
  }, [count, pathname])

  return (
    <AdminNotifications
      unread={count}
      items={notificationsOf(received.data, conversations.data, { slug, locale: "pt-BR", messages })}
      pending={received.isPending || conversations.isPending}
      ordersHref={panelNewOrdersHrefOf(slug)}
      linkComponent={AppLink}
      messages={messages}
    />
  )
}
