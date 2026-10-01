// App
import type { StorefrontRoutes } from "./storefront-routes"

/** The product a delivered order's "Avaliar produto" names, so the tab opens its form. */
export const REVIEW_PRODUCT_KEY = "produto"
/** What a review form's post came to, under the shared `aviso`, and the key a refused one comes back under. */
export const REVIEW_SENT = "avaliacao-enviada"
export const REVIEW_SAVED = "avaliacao-salva"
export const REVIEWS_ERROR_KEY = "erro-avaliacoes"

/** One product's place on the tab: its form, or its review. */
export function reviewAnchorOf(productId: string): string {
  return `avaliar-${productId}`
}

/** Where "★ Avaliar produto" leads: the tab, opened on that product. */
export function reviewHrefOf(routes: StorefrontRoutes, productId: string): string {
  return `${routes.accountTab("reviews", { [REVIEW_PRODUCT_KEY]: productId })}#${reviewAnchorOf(productId)}`
}

/** Where a review's form posts, under the shop's own path, where the shopper's cookies live. */
export function reviewsActionOf(slug: string): string {
  return `/${encodeURIComponent(slug)}/api/customer/avaliacoes`
}
