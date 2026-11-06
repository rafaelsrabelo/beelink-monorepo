// Types
import type { StorefrontCatalog } from "@harness-monorepo/contracts"

// UI
import { StorefrontCartUpsell } from "@harness-monorepo/ui/blocks/storefront/storefront-cart-upsell"
import type { StorefrontInstallmentTerms } from "@harness-monorepo/ui/lib/installments"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// App
import { AppLink } from "@/components/app-link"
import { StorefrontCardCartLive } from "./storefront-card-cart-live"

/** Two rows of four on a computer, four rows of two on a phone: more is a shelf, and the shelf is a page of its own. */
const SUGGESTIONS_MAX = 8

export interface StorefrontCartSuggestionsProps {
  /** The shop's catalogue in its own order, read with the cart; null when the read failed, and nothing is drawn. */
  catalogue: StorefrontCatalog | null
  /** The products in the cart as the page was served: none of them is suggested. */
  excluding: readonly string[]
  productHref: (productSlug: string) => string
  showPrice: boolean
  /** The shop's card terms, for "em até 6x" under a price; absent when it splits nothing. */
  installments?: StorefrontInstallmentTerms
  messages: UiMessages
}

/**
 * The cart's "Você também pode gostar": the shop's own order, less what is in the cart already —
 * the listing never lists a sold-out product, so none is suggested. Each card adds its product here
 * as a shelf's card does, with the same `StorefrontCardCartLive`; the cart above reads the page again
 * for it, and the product leaves the suggestions once it is in the cart.
 */
export function StorefrontCartSuggestions({ catalogue, excluding, productHref, showPrice, installments, messages }: StorefrontCartSuggestionsProps) {
  const inCart = new Set(excluding)
  const products = (catalogue?.products ?? []).filter((product) => !inCart.has(product.id)).slice(0, SUGGESTIONS_MAX)

  return (
    <StorefrontCartUpsell
      products={products}
      productHref={productHref}
      locale="pt-BR"
      showPrice={showPrice}
      {...(installments ? { installments } : {})}
      cardAction={(product) => <StorefrontCardCartLive product={product} messages={messages} />}
      linkComponent={AppLink}
      messages={messages}
    />
  )
}
