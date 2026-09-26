"use client"

// UI
import { StorefrontFeaturedBuy } from "@harness-monorepo/ui/blocks/storefront/storefront-featured-buy"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// App
import { useCart } from "./cart-provider"

export interface StorefrontFeaturedBuyLiveProps {
  product: { id: string; name: string; hasOptions?: boolean; soldOut: boolean }
  /** Strings and not `StorefrontRoutes`: its functions cannot cross into a client component. */
  productHref: string
  cartHref: string | null
  messages: UiMessages
}

/**
 * The featured product's button, into the shop's cart: a product with no choice to make goes in as
 * itself, with no variant to name, on the way to the cart; everything else goes to its page.
 */
export function StorefrontFeaturedBuyLive({ product, productHref, cartHref, messages }: StorefrontFeaturedBuyLiveProps) {
  const add = useCart((cart) => cart.add)

  return (
    <StorefrontFeaturedBuy
      name={product.name}
      productHref={productHref}
      cartHref={cartHref}
      {...(product.hasOptions !== undefined ? { hasOptions: product.hasOptions } : {})}
      soldOut={product.soldOut}
      onBuy={() => add({ productId: product.id, variantId: null, qty: 1 })}
      messages={messages}
    />
  )
}
