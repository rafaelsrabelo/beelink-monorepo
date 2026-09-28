// Types
import type { CustomerOrderSituation } from "@harness-monorepo/contracts"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// UI
import { StorefrontOrderCard } from "@harness-monorepo/ui/blocks/storefront/storefront-order-card"
import { StorefrontOrderTabs } from "@harness-monorepo/ui/blocks/storefront/storefront-order-tabs"
import { StorefrontOrdersEmpty } from "@harness-monorepo/ui/blocks/storefront/storefront-orders-empty"
import { StorefrontOrdersToolbar } from "@harness-monorepo/ui/blocks/storefront/storefront-orders-toolbar"
import { StorefrontPagination } from "@harness-monorepo/ui/blocks/storefront/storefront-pagination"

// App
import { AppLink } from "@/components/app-link"
import { customerOrdersAt } from "@/lib/customer-orders"
import { orderCardViewOf } from "@/lib/order-card-view"
import { isFiltered, ORDER_LIST_KEYS, orderListApiQueryOf, orderListEntriesOf, orderListQueryOf, type OrderListQuery } from "@/lib/order-list-query"
import type { StorefrontRoutes } from "@/lib/storefront-routes"
import type { SectionQuery } from "@/lib/storefront-section"
import { OrderCancelLive } from "./order-cancel-live"

export interface OrdersTabProps {
  slug: string
  routes: StorefrontRoutes
  query: SectionQuery
  locale: string
  messages: UiMessages
}

const TABS: readonly { key: "ALL" | CustomerOrderSituation; situation: CustomerOrderSituation | undefined }[] = [
  { key: "ALL", situation: undefined },
  { key: "ACTIVE", situation: "ACTIVE" },
  { key: "DELIVERED", situation: "DELIVERED" },
  { key: "CANCELLED", situation: "CANCELLED" },
]

/**
 * Meus pedidos (6d): the list of the shopper's orders at this shop, narrowed by the address — tab,
 * period, search, page — and read on the server with their session. Nothing here is cached: the
 * list is theirs and moves under them.
 */
export async function OrdersTab({ slug, routes, query, locale, messages }: OrdersTabProps) {
  const text = messages.storefront
  const asked = orderListQueryOf(query)
  const page = await customerOrdersAt(slug, orderListApiQueryOf(asked))
  const href = (patch: Partial<OrderListQuery>) => routes.accountTab("orders", orderListEntriesOf(asked, patch))

  if (!page) {
    return <StorefrontOrdersEmpty variant="filtered" href={routes.accountTab("orders")} linkComponent={AppLink} messages={messages} />
  }

  const tabLabels = { ALL: text.ordersTabAll, ACTIVE: text.ordersTabActive, DELIVERED: text.ordersTabDelivered, CANCELLED: text.ordersTabCancelled }
  const periods = [
    { value: "", label: text.ordersAllTime },
    { value: "3m", label: text.ordersLastMonths },
    ...page.years.map((year) => ({ value: String(year), label: String(year) })),
  ]
  const pageCount = Math.max(1, Math.ceil(page.total / page.pageSize))
  const nothingEver = page.total === 0 && !isFiltered(asked)

  return (
    <div className="flex flex-col gap-5">
      {nothingEver ? null : (
        <>
          <StorefrontOrdersToolbar
            action={routes.accountTab("orders")}
            names={{ search: ORDER_LIST_KEYS.search, period: ORDER_LIST_KEYS.period }}
            value={{ search: asked.search, period: asked.period ?? "" }}
            periods={periods}
            hidden={asked.situation ? { [ORDER_LIST_KEYS.situation]: orderListEntriesOf(asked)[ORDER_LIST_KEYS.situation]! } : {}}
            messages={messages}
          />
          <StorefrontOrderTabs
            tabs={TABS.map((tab) => ({ label: tabLabels[tab.key], count: page.counts[tab.key], href: href({ situation: tab.situation }), current: asked.situation === tab.situation }))}
            linkComponent={AppLink}
            messages={messages}
          />
        </>
      )}

      {page.orders.length === 0 ? (
        <StorefrontOrdersEmpty variant={nothingEver ? "none" : "filtered"} href={nothingEver ? routes.catalog() : routes.accountTab("orders")} linkComponent={AppLink} messages={messages} />
      ) : (
        <ul className="flex flex-col gap-4">
          {page.orders.map((order) => (
            <li key={order.number}>
              <StorefrontOrderCard
                {...orderCardViewOf(order, { routes, locale, messages })}
                // Each action joins with its ticket; the customer's cancel is the API's from J2.
                actions={order.status === "RECEIVED" ? <OrderCancelLive slug={slug} number={order.number} messages={messages} /> : undefined}
                linkComponent={AppLink}
                messages={messages}
              />
            </li>
          ))}
        </ul>
      )}

      {pageCount > 1 ? <StorefrontPagination page={page.page} pageCount={pageCount} href={(next) => href({ page: next })} linkComponent={AppLink} messages={messages} /> : null}
    </div>
  )
}
