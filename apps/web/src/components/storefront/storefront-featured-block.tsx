// React
import type { ReactNode } from "react"

// Types
import type { PublicComponent, PublicFeaturedProduct } from "@harness-monorepo/contracts"

// UI
import type { LinkComponent } from "@harness-monorepo/ui/blocks/auth/auth-link"
import { StorefrontFeaturedBuy } from "@harness-monorepo/ui/blocks/storefront/storefront-featured-buy"
import { StorefrontFeaturedProduct } from "@harness-monorepo/ui/blocks/storefront/storefront-featured-product"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// App
import type { StorefrontRoutes } from "@/lib/storefront-routes"
import { StorefrontFeaturedBuyLive } from "./storefront-featured-buy-live"

export interface StorefrontFeaturedBlockProps {
  component: PublicComponent
  routes: StorefrontRoutes
  cartReachable: boolean
  /** Design mode's preview: the button is drawn where it will be, and puts nothing in a cart. */
  editing: boolean
  linkComponent?: LinkComponent
  messages: UiMessages
}

/**
 * A featured product, drawn: nothing when the read found none on sale, and otherwise the product
 * with its button — the live one in the shop, which fills the cart, and an inert one in the editor.
 */
export function StorefrontFeaturedBlock({ component, routes, cartReachable, editing, linkComponent, messages }: StorefrontFeaturedBlockProps): ReactNode {
  const [card] = component.items as PublicFeaturedProduct[]
  if (!card) return null

  const link = linkComponent ? { linkComponent } : {}
  const productHref = routes.product(card.slug)
  const cartHref = cartReachable ? routes.cart() : null
  const hasOptions = card.hasOptions !== undefined ? { hasOptions: card.hasOptions } : {}

  return (
    <StorefrontFeaturedProduct
      layout={component.display === "IMAGE_LARGE" ? "IMAGE_LARGE" : "IMAGE_LEFT"}
      title={component.title}
      subtitle={component.subtitle}
      product={{ ...card, href: productHref }}
      action={
        editing ? (
          <StorefrontFeaturedBuy name={card.name} productHref={productHref} cartHref={cartHref} {...hasOptions} soldOut={card.soldOut} {...link} messages={messages} />
        ) : (
          <StorefrontFeaturedBuyLive product={card} productHref={productHref} cartHref={cartHref} messages={messages} />
        )
      }
      span={component.span}
      locale="pt-BR"
      {...link}
      messages={messages}
    />
  )
}
