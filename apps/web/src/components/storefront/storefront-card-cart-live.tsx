"use client"

// UI
import { StorefrontCardCartButton } from "@harness-monorepo/ui/blocks/storefront/storefront-card-cart-button"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// App
import { useCart } from "./cart-provider"

export interface StorefrontCardCartLiveProps {
  product: { id: string; name: string; hasOptions?: boolean }
  messages: UiMessages
}

/**
 * A card's "Adicionar ao carrinho", into the shop's cart. Only a product known to sell no
 * combinations goes in from the card — as itself, with no variant to name; the rest are chosen on
 * their page, which is where the block sends them.
 */
export function StorefrontCardCartLive({ product, messages }: StorefrontCardCartLiveProps) {
  const add = useCart((cart) => cart.add)

  return (
    <StorefrontCardCartButton
      name={product.name}
      {...(product.hasOptions !== undefined ? { hasOptions: product.hasOptions } : {})}
      onAdd={() => add({ productId: product.id, variantId: null, qty: 1 })}
      messages={messages}
    />
  )
}
