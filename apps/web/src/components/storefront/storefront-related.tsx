// Types
import type { StorefrontCatalog } from "@harness-monorepo/contracts"

// UI
import { StorefrontRelatedRail } from "@harness-monorepo/ui/blocks/storefront/storefront-related-rail"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// App
import { StorefrontCardCartLive } from "./storefront-card-cart-live"

/** 5b's related rail holds three pages of six. */
const RELATED_MAX = 18

export interface StorefrontRelatedProps {
  /** Started by the page before it rendered anything, so the read runs while the rest streams. */
  catalogue: Promise<StorefrontCatalog | null>
  /** The product on this page, which is never its own suggestion. */
  productId: string
  productHref: (productSlug: string) => string
  showPrice: boolean
  /** "+" on each card — the shop's `showQuickAdd`, as on its shelves. */
  quickAdd?: boolean
  messages: UiMessages
}

/**
 * The product page's "Você também pode gostar", from the product's own category. Awaited inside a
 * Suspense boundary: the product is on screen before this read ends, and a read that fails is an
 * absent rail, never a broken page.
 *
 * Each card adds its product to the cart as a shelf's card does — the same `StorefrontCardCartLive`,
 * so the same `useAddToCart`, and one "added to cart" told from one place. The read is the listing's,
 * which says whether a product sells combinations and never lists a sold-out one.
 */
export async function StorefrontRelated({ catalogue, productId, productHref, showPrice, quickAdd = false, messages }: StorefrontRelatedProps) {
  const found = await catalogue
  const products = (found?.products ?? []).filter((product) => product.id !== productId).slice(0, RELATED_MAX)

  return (
    <StorefrontRelatedRail
      products={products}
      productHref={productHref}
      locale="pt-BR"
      showPrice={showPrice}
      {...(quickAdd ? { cardAction: (product) => <StorefrontCardCartLive product={product} size="icon" messages={messages} /> } : {})}
      messages={messages}
    />
  )
}
