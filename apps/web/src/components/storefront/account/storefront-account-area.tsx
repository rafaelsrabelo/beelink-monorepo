// React
import { Suspense, type ReactNode } from "react"

// Types
import type { CustomerProfile, StorefrontAccountTab } from "@harness-monorepo/contracts"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// UI
import { StorefrontAccountDetails } from "@harness-monorepo/ui/blocks/storefront/storefront-account-details"
import { StorefrontAccountMenu } from "@harness-monorepo/ui/blocks/storefront/storefront-account-menu"
import { StorefrontAccountOverview } from "@harness-monorepo/ui/blocks/storefront/storefront-account-overview"
import { StorefrontAccountShell } from "@harness-monorepo/ui/blocks/storefront/storefront-account-shell"
import { StorefrontOrderNowSkeleton } from "@harness-monorepo/ui/blocks/storefront/storefront-order-now-skeleton"

// App
import { AppLink } from "@/components/app-link"
import { accountContactOf, accountMenuOf, accountTabTitleOf, customerSignOutActionOf } from "@/lib/account-menu"
import { accountDetailsViewOf } from "@/lib/account-overview"
import type { StorefrontRoutes } from "@/lib/storefront-routes"
import { AccountOrdersNow } from "./account-orders-now"

export interface StorefrontAccountAreaProps {
  slug: string
  routes: StorefrontRoutes
  shopper: CustomerProfile
  /** Null on the area's front, which draws the overview; a tab draws `children` under its title. */
  tab: StorefrontAccountTab | null
  /** How many orders are in progress, for the menu's pill; absent, none is drawn. */
  activeOrders?: number
  /** How many products the shopper liked, beside Favoritos in the menu (6g). */
  favorites?: number
  /** Beside a tab's title: its search and filters. */
  tools?: ReactNode
  children?: ReactNode
  messages: UiMessages
}

/**
 * The shopper's area at a shop: its menu, and the front or one tab of it. The menu lists only the
 * tabs delivered. The front tells what the shopper would come to check — the order on its way and
 * their details — and leaves the way to each tab to the menu beside it.
 */
export function StorefrontAccountArea({ slug, routes, shopper, tab, activeOrders, favorites, tools, children, messages }: StorefrontAccountAreaProps) {
  const text = messages.storefront
  const menu = (
    <StorefrontAccountMenu
      shopper={{ name: shopper.name, contact: accountContactOf(shopper) }}
      items={accountMenuOf(routes, { orders: activeOrders, favorites })}
      current={tab ?? "overview"}
      signOutAction={customerSignOutActionOf(slug)}
      linkComponent={AppLink}
      messages={messages}
    />
  )

  return (
    <StorefrontAccountShell
      menu={menu}
      page={tab ? { kind: "tab", title: accountTabTitleOf(tab, text), backHref: routes.account(), tools } : { kind: "overview" }}
      linkComponent={AppLink}
      messages={messages}
    >
      {tab ? (
        children
      ) : (
        <StorefrontAccountOverview name={shopper.name} messages={messages}>
          <Suspense fallback={<StorefrontOrderNowSkeleton />}>
            <AccountOrdersNow slug={slug} routes={routes} locale="pt-BR" messages={messages} />
          </Suspense>
          <StorefrontAccountDetails {...accountDetailsViewOf(shopper)} editHref={routes.accountTab("profile")} linkComponent={AppLink} messages={messages} />
        </StorefrontAccountOverview>
      )}
    </StorefrontAccountShell>
  )
}
