// Types
import type { CustomerProfile, StorefrontAccountTab, StorefrontRouteWords } from "@harness-monorepo/contracts"
import type { StorefrontAccountDropdownItem, StorefrontAccountDropdownKey } from "@harness-monorepo/ui/blocks/storefront/storefront-account-dropdown"
import type { StorefrontAccountMenuItem } from "@harness-monorepo/ui/blocks/storefront/storefront-account-menu"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// App
import { accountTabOf, type StorefrontRoutes } from "./storefront-routes"

/**
 * The tabs that exist. Each ticket of the area appends its own: a tab listed here before its page
 * is built would be a menu entry that opens nothing.
 */
export const DELIVERED_ACCOUNT_TABS: readonly StorefrontAccountTab[] = ["orders", "favorites", "profile", "messages"]

/** The tab a third segment under the account opens, or null: a word of a tab not delivered opens nothing. */
export function deliveredAccountTabOf(segment: string, routeWords: StorefrontRouteWords): StorefrontAccountTab | null {
  const tab = accountTabOf(segment, routeWords)
  return tab && DELIVERED_ACCOUNT_TABS.includes(tab) ? tab : null
}

/** The area's menu: the overview, then each delivered tab in the design's order, with its count when it has one. */
export function accountMenuOf(routes: StorefrontRoutes, counts: Partial<Record<StorefrontAccountTab, number>> = {}): StorefrontAccountMenuItem[] {
  return [{ key: "overview", href: routes.account() }, ...DELIVERED_ACCOUNT_TABS.map((tab) => ({ key: tab, href: routes.accountTab(tab), count: counts[tab] ?? null }))]
}

/** Where "Sair" posts, from the area's menu and from the header's. */
export function customerSignOutActionOf(slug: string): string {
  return `/${slug}/api/customer/sair`
}

/** The pages the header's account menu offers (J21), in its order. The overview is its heading, not an entry. */
const HEADER_MENU_TABS: readonly StorefrontAccountDropdownKey[] = ["orders", "profile", "messages"]

/** The header's account menu: the offered tabs that are delivered, and where "Sair" posts. */
export function headerAccountMenuOf(routes: StorefrontRoutes, slug: string): { items: StorefrontAccountDropdownItem[]; signOutAction: string } {
  return {
    items: HEADER_MENU_TABS.filter((tab) => DELIVERED_ACCOUNT_TABS.includes(tab)).map((tab) => ({ key: tab, href: routes.accountTab(tab) })),
    signOutAction: customerSignOutActionOf(slug),
  }
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

/** A phone as a person writes it — the record keeps "5585999994321" — or null when none is on file. */
export function phoneLineOf(phone: string | null): string | null {
  if (!phone) return null
  const local = phone.startsWith("55") && (phone.length === 12 || phone.length === 13) ? phone.slice(2) : phone
  return local.length === 10 || local.length === 11 ? `(${local.slice(0, 2)}) ${local.slice(2, -4)}-${local.slice(-4)}` : phone
}

/** The line under the shopper's name in the menu: their phone, else the account's e-mail. */
export function accountContactOf(shopper: Pick<CustomerProfile, "phone" | "email">): string {
  return phoneLineOf(shopper.phone) ?? shopper.email
}
