// React
import type { ReactNode } from "react"

// Types
import type { CustomerProfile, StorefrontAccountTab } from "@harness-monorepo/contracts"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// UI
import { StorefrontAccountMenu } from "@harness-monorepo/ui/blocks/storefront/storefront-account-menu"
import { StorefrontAccountOverview } from "@harness-monorepo/ui/blocks/storefront/storefront-account-overview"
import { StorefrontAccountShell } from "@harness-monorepo/ui/blocks/storefront/storefront-account-shell"

// App
import { AppLink } from "@/components/app-link"
import { accountContactOf, accountMenuOf, accountShortcutsOf, accountTabTitleOf } from "@/lib/account-menu"
import type { StorefrontRoutes } from "@/lib/storefront-routes"

export interface StorefrontAccountAreaProps {
  slug: string
  routes: StorefrontRoutes
  shopper: CustomerProfile
  /** Null on the area's front, which draws the overview; a tab draws `children` under its title. */
  tab: StorefrontAccountTab | null
  /** How many orders are in progress, for the menu's pill; absent, none is drawn. */
  activeOrders?: number
  children?: ReactNode
  messages: UiMessages
}

/**
 * The shopper's area at a shop: its menu, and the front or one tab of it. The menu lists only the
 * tabs delivered; the front's cards follow the same list.
 */
export function StorefrontAccountArea({ slug, routes, shopper, tab, activeOrders, children, messages }: StorefrontAccountAreaProps) {
  const text = messages.storefront
  const menu = (
    <StorefrontAccountMenu
      shopper={{ name: shopper.name, contact: accountContactOf(shopper) }}
      items={accountMenuOf(routes, { orders: activeOrders })}
      current={tab ?? "overview"}
      signOutAction={`/${slug}/api/customer/sair`}
      linkComponent={AppLink}
      messages={messages}
    />
  )

  return (
    <StorefrontAccountShell
      menu={menu}
      page={tab ? { kind: "tab", title: accountTabTitleOf(tab, text), backHref: routes.account() } : { kind: "overview" }}
      linkComponent={AppLink}
      messages={messages}
    >
      {tab ? children : <StorefrontAccountOverview name={shopper.name} shortcuts={accountShortcutsOf(routes, text)} linkComponent={AppLink} messages={messages} />}
    </StorefrontAccountShell>
  )
}
