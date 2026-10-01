// Types
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// UI
import { StorefrontFavoritesRail } from "@harness-monorepo/ui/blocks/storefront/storefront-favorites-rail"

// App
import { AppLink } from "@/components/app-link"
import { customerFavoritesAt } from "@/lib/customer-favorites"
import { favoritesRailItemsOf, OVERVIEW_FAVORITES } from "@/lib/overview-parts"
import type { StorefrontRoutes } from "@/lib/storefront-routes"

export interface AccountFavoritesRailProps {
  slug: string
  routes: StorefrontRoutes
  locale: string
  messages: UiMessages
}

/**
 * "Seus favoritos" on the account's front (6c): the products liked last, and how many there are and
 * got cheaper — the same page the menu's count read, so no second call. None, or a read that failed,
 * draws nothing.
 */
export async function AccountFavoritesRail({ slug, routes, locale, messages }: AccountFavoritesRailProps) {
  const page = await customerFavoritesAt(slug, { pageSize: OVERVIEW_FAVORITES })
  if (!page || page.favorites.length === 0) return null

  return (
    <StorefrontFavoritesRail
      items={favoritesRailItemsOf(page.favorites, routes)}
      total={page.counts.ALL}
      dropped={page.counts.PRICE_DROPPED}
      allHref={routes.accountTab("favorites")}
      locale={locale}
      linkComponent={AppLink}
      messages={messages}
    />
  )
}
