"use client"

// UI
import type { LinkComponent } from "@harness-monorepo/ui/blocks/auth/auth-link"
import { StorefrontCardCartButton } from "@harness-monorepo/ui/blocks/storefront/storefront-card-cart-button"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// App
import { useCart } from "./cart-provider"
import { useAddToCart } from "./use-add-to-cart"

export interface StorefrontCardCartLiveProps {
  product: { id: string; name: string; priceCents: number; hasOptions?: boolean }
  /** `icon` on a compact card: the round "+" of the product page's related rail. */
  size?: "pill" | "icon"
  /** The checkout's address, for the card's "Comprar agora"; absent, the card offers the add alone. */
  checkoutHref?: string
  linkComponent?: LinkComponent
  messages: UiMessages
}

/**
 * A card's "Adicionar ao carrinho", into the shop's cart — and, given the checkout's address, its
 * "Comprar agora", on the way there. Only a product known to sell no combinations goes in from the
 * card — as itself, with no variant to name; the rest are chosen on their page, which is where the
 * block sends them.
 */
export function StorefrontCardCartLive({ product, size, checkoutHref, linkComponent, messages }: StorefrontCardCartLiveProps) {
  const add = useAddToCart()
  const inCart = useCart((cart) => cart.lines.some((line) => line.productId === product.id && line.variantId === null))
  const addOne = () => add({ productId: product.id, variantId: null, qty: 1 }, { name: product.name, unitPriceCents: product.priceCents })

  return (
    <StorefrontCardCartButton
      name={product.name}
      {...(product.hasOptions !== undefined ? { hasOptions: product.hasOptions } : {})}
      onAdd={addOne}
      // "Comprar agora" buys the product, not one more of it: one the cart holds already goes to the checkout as it is.
      {...(checkoutHref ? { checkoutHref, onBuy: () => (inCart ? undefined : addOne()) } : {})}
      {...(size ? { size } : {})}
      {...(linkComponent ? { linkComponent } : {})}
      messages={messages}
    />
  )
}
