// React
import type { ReactNode } from "react"

// UI
import type { StorefrontInstallmentTerms } from "@harness-monorepo/ui/lib/installments"

// Locales
import { defaultMessages } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import { AnchorLink, type LinkComponent } from "../auth/auth-link"
import { StorefrontProductCard, type StorefrontProduct } from "./storefront-product-card"
import { PRODUCT_SECTION_HEADING } from "./storefront-product-section"

export interface StorefrontCartUpsellProps {
  /** None of them in the cart already, and none sold out: the screen leaves those out. */
  products: readonly StorefrontProduct[]
  /** Built by the screen: a block never knows that a product lives under `/<shop>/<word>/<slug>`. */
  productHref: (productSlug: string) => string
  locale: string
  showPrice?: boolean
  /** The shop's card terms, for the line under each price. */
  installments?: StorefrontInstallmentTerms
  /** Under each card's price: the web's "Adicionar ao carrinho", which adds it to this cart. */
  cardAction?: (product: StorefrontProduct) => ReactNode
  linkComponent?: LinkComponent
  messages?: UiMessages
}

/** One per page: the cart's. A fixed id, since the block is drawn on the server, where no hook runs. */
const HEADING_ID = "cart-upsell"

/**
 * The cart's "Você também pode gostar": more of the shop, each card with its own "Adicionar ao
 * carrinho", so a product goes into the cart from the cart — and the total above follows — without
 * the shopper going back to the shelves for it. Two across on a phone, as a shelf is; four from `shop-lg`.
 *
 * Under the cart's button, never over it: what the shopper came to the page for is finishing.
 */
export function StorefrontCartUpsell({ products, productHref, locale, showPrice = true, installments, cardAction, linkComponent: Link = AnchorLink, messages = defaultMessages }: StorefrontCartUpsellProps) {
  if (products.length === 0) return null

  return (
    <section aria-labelledby={HEADING_ID} className="flex flex-col gap-4 border-t border-shop-line pt-7">
      <h2 id={HEADING_ID} className={PRODUCT_SECTION_HEADING}>
        {messages.storefront.relatedHeading}
      </h2>
      <ul className="grid grid-cols-2 gap-3 shop-sm:gap-4 shop-lg:grid-cols-4">
        {products.map((product) => (
          <li key={product.id} className="flex">
            <StorefrontProductCard
              product={product}
              href={productHref(product.slug)}
              locale={locale}
              showPrice={showPrice}
              {...(installments ? { installments } : {})}
              {...(cardAction ? { action: cardAction(product) } : {})}
              linkComponent={Link}
              messages={messages}
            />
          </li>
        ))}
      </ul>
    </section>
  )
}
