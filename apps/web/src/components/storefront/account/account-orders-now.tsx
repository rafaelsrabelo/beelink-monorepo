// Types
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// UI
import { StorefrontAccountOrdersNote } from "@harness-monorepo/ui/blocks/storefront/storefront-account-orders-note"
import { StorefrontOrderNow } from "@harness-monorepo/ui/blocks/storefront/storefront-order-now"

// App
import { AppLink } from "@/components/app-link"
import { lastOrderViewOf, orderNowViewOf } from "@/lib/account-overview"
import { customerOrderAt, customerOrdersAt } from "@/lib/customer-orders"
import type { StorefrontRoutes } from "@/lib/storefront-routes"
import { OrderTalkLive } from "../conversations/order-talk-live"

export interface AccountOrdersNowProps {
  slug: string
  routes: StorefrontRoutes
  locale: string
  messages: UiMessages
}

/**
 * What the front says about orders first: the most recent one on its way, with its steps — else
 * how the last one ended, else an invitation to the shelf. The count of those on their way is the
 * menu's own read, so asking it again costs nothing; the order itself is read for its timeline.
 */
export async function AccountOrdersNow({ slug, routes, locale, messages }: AccountOrdersNowProps) {
  const context = { routes, locale, messages }
  const unavailable = <StorefrontAccountOrdersNote kind="unavailable" href={routes.account()} linkComponent={AppLink} messages={messages} />

  const active = await customerOrdersAt(slug, { situation: "ACTIVE", pageSize: 1 })
  if (!active) return unavailable

  const current = active.orders[0]
  if (current) {
    const read = await customerOrderAt(slug, current.number)
    if (read.status !== "found") return unavailable
    return (
      <StorefrontOrderNow
        {...orderNowViewOf(read.order, active.counts.ACTIVE - 1, context)}
        actions={<OrderTalkLive number={read.order.number} href={routes.accountConversation(read.order.number)} emphasis="quiet" messages={messages} />}
        linkComponent={AppLink}
        messages={messages}
      />
    )
  }

  if (active.counts.ALL === 0) return <StorefrontAccountOrdersNote kind="none" href={routes.catalog()} linkComponent={AppLink} messages={messages} />

  const last = (await customerOrdersAt(slug, { pageSize: 1 }))?.orders[0]
  if (!last) return unavailable
  return <StorefrontAccountOrdersNote kind="last" order={lastOrderViewOf(last, context)} href={routes.accountTab("orders")} linkComponent={AppLink} messages={messages} />
}
