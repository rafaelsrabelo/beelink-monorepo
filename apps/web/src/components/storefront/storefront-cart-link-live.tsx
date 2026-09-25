"use client"

// UI
import { StorefrontCartLink } from "@harness-monorepo/ui/blocks/storefront/storefront-cart-link"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// App
import { useCart } from "./cart-provider"
import { countOf } from "@/lib/cart-cookie"

export interface StorefrontCartLinkLiveProps {
  href: string
  messages: UiMessages
}

/** The header's cart, following the cart as it fills. It starts from the cookie the server read. */
export function StorefrontCartLinkLive({ href, messages }: StorefrontCartLinkLiveProps) {
  const count = useCart((cart) => countOf(cart.lines))

  return <StorefrontCartLink href={href} count={count} messages={messages} />
}
