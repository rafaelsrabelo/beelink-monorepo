// Types
import type { CustomerProfile, StorefrontAccountTab, StorefrontRouteWords } from "@harness-monorepo/contracts"
import type { StorefrontAccountMenuItem } from "@harness-monorepo/ui/blocks/storefront/storefront-account-menu"
import type { StorefrontAccountShortcut } from "@harness-monorepo/ui/blocks/storefront/storefront-account-overview"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// App
import { accountTabOf, type StorefrontRoutes } from "./storefront-routes"

/**
 * The tabs that exist. Each ticket of the area appends its own: a tab listed here before its page
 * is built would be a menu entry that opens nothing.
 */
export const DELIVERED_ACCOUNT_TABS: readonly StorefrontAccountTab[] = ["profile"]

/** The tab a third segment under the account opens, or null: a word of a tab not delivered opens nothing. */
export function deliveredAccountTabOf(segment: string, routeWords: StorefrontRouteWords): StorefrontAccountTab | null {
  const tab = accountTabOf(segment, routeWords)
  return tab && DELIVERED_ACCOUNT_TABS.includes(tab) ? tab : null
}

/** The area's menu: the overview, then each delivered tab in the design's order. */
export function accountMenuOf(routes: StorefrontRoutes): StorefrontAccountMenuItem[] {
  return [{ key: "overview", href: routes.account() }, ...DELIVERED_ACCOUNT_TABS.map((tab) => ({ key: tab, href: routes.accountTab(tab) }))]
}

/** The overview's cards: one per delivered tab, with what it holds in a line. */
export function accountShortcutsOf(routes: StorefrontRoutes, text: UiMessages["storefront"]): StorefrontAccountShortcut[] {
  const hints: Partial<Record<StorefrontAccountTab, string>> = { profile: text.accountProfileHint }
  return DELIVERED_ACCOUNT_TABS.map((tab) => ({ key: tab, href: routes.accountTab(tab), hint: hints[tab] ?? null }))
}

/** The menu's title for a tab, in the shopper's words. */
export function accountTabTitleOf(tab: StorefrontAccountTab, text: UiMessages["storefront"]): string {
  const titles: Record<StorefrontAccountTab, string> = {
    orders: text.accountOrders,
    favorites: text.accountFavorites,
    reviews: text.accountReviews,
    profile: text.accountProfile,
    messages: text.accountMessages,
  }
  return titles[tab]
}

/**
 * The line under the shopper's name in the menu: their phone as a person writes it — the record
 * keeps "5585999994321" — else the account's e-mail.
 */
export function accountContactOf(shopper: Pick<CustomerProfile, "phone" | "email">): string {
  const digits = shopper.phone ?? ""
  const local = digits.startsWith("55") && (digits.length === 12 || digits.length === 13) ? digits.slice(2) : digits
  if (local.length === 10 || local.length === 11) {
    return `(${local.slice(0, 2)}) ${local.slice(2, -4)}-${local.slice(-4)}`
  }
  return shopper.phone ?? shopper.email
}
