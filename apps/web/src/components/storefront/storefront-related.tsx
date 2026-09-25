// Types
import type { StorefrontCatalog } from "@harness-monorepo/contracts"

// UI
import { StorefrontRelatedRail } from "@harness-monorepo/ui/blocks/storefront/storefront-related-rail"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

/** 5b's related rail holds three pages of six. */
const RELATED_MAX = 18

export interface StorefrontRelatedProps {
  /** Started by the page before it rendered anything, so the read runs while the rest streams. */
  catalogue: Promise<StorefrontCatalog | null>
  /** The product on this page, which is never its own suggestion. */
  productId: string
  productHref: (productSlug: string) => string
  showPrice: boolean
  messages: UiMessages
}

/**
 * The product page's "Você também pode gostar", from the product's own category. Awaited inside a
 * Suspense boundary: the product is on screen before this read ends, and a read that fails is an
 * absent rail, never a broken page.
 */
export async function StorefrontRelated({ catalogue, productId, productHref, showPrice, messages }: StorefrontRelatedProps) {
  const found = await catalogue
  const products = (found?.products ?? []).filter((product) => product.id !== productId).slice(0, RELATED_MAX)

  return <StorefrontRelatedRail products={products} productHref={productHref} locale="pt-BR" showPrice={showPrice} messages={messages} />
}
