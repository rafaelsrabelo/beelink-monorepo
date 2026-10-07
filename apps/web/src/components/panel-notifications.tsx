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
import { REALTIME_URL } from "@/lib/realtime-config"
import { notificationCountOf, notificationsOf, PAID_UNSEEN_QUERY, panelNewOrdersHrefOf, titledWith } from "@/lib/panel-notifications"
import { useShopConversations } from "@/services/conversations/shop-conversation-hooks"
import { useOrders } from "@/services/orders/order-hooks"
import { usePanelCounts } from "@/services/panel/panel-counts-hooks"

export interface PanelNotificationsProps {
  slug: string
  locale: string
  messages: UiMessages
}

const RECEIVED = { status: "RECEIVED", pageSize: 5 } as const
const UNREAD = { filter: "UNREAD" } as const
/** Without the channel, the new orders are read again as the conversations are: every half minute. */
const WITHOUT_CHANNEL = { refetchInterval: REALTIME_URL ? (false as const) : 30_000 }

/**
 * The panel's bell (BEELINK-163): unread messages, orders nobody accepted yet and — since BEELINK-207 —
 * orders paid online that nobody opened since, counted and listed.
 * Every read here is one the real-time channel reads again at each event, so the count moves on its
 * own; the tab's title carries it too, for a panel left behind another tab.
 *
 * It is the general feed. What waits in one area is that area's number in the menu (BEELINK-309);
 * the two share the counts' read and nothing else — the lists here are the bell's own.
 */
export function PanelNotifications({ slug, locale, messages }: PanelNotificationsProps) {
  const pathname = usePathname()
  // The menu's own read (BEELINK-309): one request serves both, and the bell takes its messages from it.
  const counts = usePanelCounts(slug)
  const received = useOrders(slug, RECEIVED, WITHOUT_CHANNEL)
  const paid = useOrders(slug, PAID_UNSEEN_QUERY, WITHOUT_CHANNEL)
  const conversations = useShopConversations(slug, UNREAD)
  const count = notificationCountOf(counts.data?.unreadMessages, received.data, paid.data)

  // Again at every page and language: a page with a title of its own writes it bare. Taken off when
  // the bell goes — the dashboard shares the panel's title and would keep the count for good.
  useEffect(() => {
    document.title = titledWith(document.title, count)
    return () => {
      document.title = titledWith(document.title, 0)
    }
  }, [count, pathname, locale])

  return (
    <AdminNotifications
      unread={count}
      items={notificationsOf(received.data, conversations.data, { slug, locale, messages }, paid.data)}
      pending={received.isPending || conversations.isPending || paid.isPending}
      ordersHref={panelNewOrdersHrefOf(slug)}
      linkComponent={AppLink}
      messages={messages}
    />
  )
}
