// Types
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// UI
import { StorefrontOrdersToolbar } from "@harness-monorepo/ui/blocks/storefront/storefront-orders-toolbar"

// App
import { customerOrdersAt } from "@/lib/customer-orders"
import { isFiltered, ORDER_LIST_KEYS, orderListApiQueryOf, orderListEntriesOf, orderListQueryOf } from "@/lib/order-list-query"
import type { StorefrontRoutes } from "@/lib/storefront-routes"
import type { SectionQuery } from "@/lib/storefront-section"

export interface OrdersToolbarProps {
  slug: string
  routes: StorefrontRoutes
  query: SectionQuery
  messages: UiMessages
}

/**
 * Meus pedidos' search and period, beside the tab's title as 6d draws them. The periods offered are
 * the years the shopper ordered in, from the same page the list reads — one read for both.
 */
export async function OrdersToolbar({ slug, routes, query, messages }: OrdersToolbarProps) {
  const text = messages.storefront
  const asked = orderListQueryOf(query)
  const page = await customerOrdersAt(slug, orderListApiQueryOf(asked))
  // Nothing to search in, or nothing read: the list under it says which.
  if (!page || (page.total === 0 && !isFiltered(asked))) return null

  const periods = [
    { value: "", label: text.ordersAllTime },
    { value: "3m", label: text.ordersLastMonths },
    ...page.years.map((year) => ({ value: String(year), label: String(year) })),
  ]

  return (
    <StorefrontOrdersToolbar
      action={routes.accountTab("orders")}
      names={{ search: ORDER_LIST_KEYS.search, period: ORDER_LIST_KEYS.period }}
      value={{ search: asked.search, period: asked.period ?? "" }}
      periods={periods}
      hidden={asked.situation ? { [ORDER_LIST_KEYS.situation]: orderListEntriesOf(asked)[ORDER_LIST_KEYS.situation]! } : {}}
      messages={messages}
    />
  )
}
