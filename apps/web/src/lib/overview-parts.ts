// Types
import type { CustomerFavorite, CustomerPendingReview } from "@harness-monorepo/contracts"
import type { StorefrontFavoritesRailItem } from "@harness-monorepo/ui/blocks/storefront/storefront-favorites-rail"

// App
import { favoriteProductHrefOf } from "./favorite-card-view"
import type { StorefrontRoutes } from "./storefront-routes"

/** How many purchases to rate the account's front shows; the rest are on the tab. */
export const OVERVIEW_REVIEWS = 4
/** How many favourites its rail shows — and the page the front asks for, the menu's count included, in one read. */
export const OVERVIEW_FAVORITES = 6

/**
 * The purchases the front offers to rate: the first few, with the one a refused tap came back for
 * among them, first, so its card can say why.
 */
export function quickReviewsOf(pending: readonly CustomerPendingReview[], asked: string | undefined): CustomerPendingReview[] {
  const first = pending.slice(0, OVERVIEW_REVIEWS)
  const named = asked ? pending.find((line) => line.productId === asked) : undefined
  if (!named || first.includes(named)) return first
  return [named, ...first.slice(0, OVERVIEW_REVIEWS - 1)]
}

/** A favourite as the rail draws it: on the combination liked, with how much it dropped. */
export function favoritesRailItemsOf(favorites: readonly CustomerFavorite[], routes: StorefrontRoutes): StorefrontFavoritesRailItem[] {
  return favorites.slice(0, OVERVIEW_FAVORITES).map((favorite) => ({
    productId: favorite.productId,
    href: favoriteProductHrefOf(favorite, routes),
    name: favorite.name,
    imageUrl: favorite.imageUrl,
    priceCents: favorite.priceCents,
    dropCents: favorite.priceDropCents,
    soldOut: favorite.soldOut,
  }))
}
