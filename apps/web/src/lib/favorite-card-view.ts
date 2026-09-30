// Types
import type { CustomerFavorite } from "@harness-monorepo/contracts"

// App
import type { StorefrontRoutes } from "./storefront-routes"

/** "18 set", the day it was liked, in the shop's time zone. */
export function likedOnOf(iso: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, { day: "numeric", month: "short", timeZone: "America/Sao_Paulo" }).format(new Date(iso))
}

/** The product's page, on the combination liked: where "Ver opções" and "avise-me" lead. */
export function favoriteProductHrefOf(favorite: Pick<CustomerFavorite, "slug" | "variant">, routes: StorefrontRoutes): string {
  const page = routes.product(favorite.slug)
  return favorite.variant ? `${page}?${new URLSearchParams({ variant: favorite.variant.id })}` : page
}

/** Where the heart on a card of Favoritos posts, under the shop's own path, where the shopper's cookies live. */
export function favoriteRemoveActionOf(slug: string): string {
  return `/${encodeURIComponent(slug)}/api/customer/favoritos`
}
