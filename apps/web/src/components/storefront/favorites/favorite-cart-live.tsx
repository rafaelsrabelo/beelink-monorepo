"use client"

// UI
import { StorefrontCardCartButton } from "@harness-monorepo/ui/blocks/storefront/storefront-card-cart-button"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// App
import { useAddToCart } from "../use-add-to-cart"

export interface FavoriteCartLiveProps {
  productId: string
  name: string
  /** What it costs today, which is what goes into the cart. */
  priceCents: number
  /** The combination liked, which goes in as it is; null for the product as a whole. */
  variantId: string | null
  /** A product liked as a whole that sells combinations cannot go in without a choice. */
  choose: boolean
  messages: UiMessages
}

/**
 * A favourite's "Adicionar ao carrinho", into the shop's cart: the combination liked, or a product
 * without options as itself. One liked as a whole that has options is chosen on its page — the pill
 * only looks the part, and a press falls through to the card's link.
 */
export function FavoriteCartLive({ productId, name, priceCents, variantId, choose, messages }: FavoriteCartLiveProps) {
  const add = useAddToCart()

  return <StorefrontCardCartButton name={name} hasOptions={choose} onAdd={() => add({ productId, variantId, qty: 1 }, { name, unitPriceCents: priceCents })} messages={messages} />
}
