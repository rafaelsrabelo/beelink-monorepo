// React
import type { ReactNode } from "react"

// UI
import { cn } from "@harness-monorepo/ui/lib/utils"

// Locales
import { defaultMessages } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import { AnchorLink, type LinkComponent } from "../auth/auth-link"
import type { StorefrontSpan } from "./storefront-band-cell"
import { StorefrontDiscountBadge, StorefrontPrice } from "./storefront-price"
import { SIDE_BY_SIDE } from "./storefront-span-shape"

/** The product as the block draws it, its address already built for this shop. */
export interface StorefrontFeaturedItem {
  name: string
  href: string
  imageUrl: string | null
  priceCents: number
  compareAtPriceCents: number | null
  soldOut: boolean
}

export interface StorefrontFeaturedProductProps {
  /** `IMAGE_LEFT`: the photo beside the words. `IMAGE_LARGE`: the photo wide, the words under it. */
  layout: "IMAGE_LEFT" | "IMAGE_LARGE"
  /** A line over the product — "Oferta relâmpago" — which heads the block when there is one. */
  title?: string | null
  subtitle?: string | null
  product: StorefrontFeaturedItem
  /** The way to buy it, drawn by whoever knows the cart: the shop window's live button, or nothing. */
  action?: ReactNode
  span?: StorefrontSpan
  locale: string
  linkComponent?: LinkComponent
  className?: string
  messages?: UiMessages
}

/**
 * One product, large: its photo, its name, its price, and the way to buy it.
 *
 * The block's title is its `h2` and the product's name an `h3` under it; with no title the name heads
 * the block. The photo says nothing the name beside it does not, so it is decorative, as on a card.
 * "Esgotado" is always said: it is why there is no button to buy.
 */
export function StorefrontFeaturedProduct({
  layout,
  title,
  subtitle,
  product,
  action,
  span = "FULL",
  locale,
  linkComponent: Link = AnchorLink,
  className,
  messages = defaultMessages,
}: StorefrontFeaturedProductProps) {
  const text = messages.storefront
  const Name = title ? "h3" : "h2"
  const large = layout === "IMAGE_LARGE"

  return (
    <div className={cn("grid items-center gap-6", large ? "mx-auto w-full max-w-4xl" : SIDE_BY_SIDE[span], className)}>
      <Link href={product.href} tabIndex={-1} aria-hidden="true" className="relative block overflow-hidden rounded-2xl bg-shop-placeholder">
        {product.imageUrl ? (
          <img src={product.imageUrl} alt="" className={cn("w-full object-cover", large ? "aspect-[16/9]" : "aspect-square")} />
        ) : (
          <span className={cn("block w-full", large ? "aspect-[16/9]" : "aspect-square")} />
        )}
        <StorefrontDiscountBadge
          priceCents={product.priceCents}
          compareAtPriceCents={product.compareAtPriceCents}
          className="absolute top-3 left-3"
          messages={messages}
        />
      </Link>

      <div className={cn("flex flex-col gap-3", large ? "items-center text-center" : "items-start")}>
        {title ? <h2 className="text-sm font-semibold tracking-wide text-shop-primary-ink uppercase">{title}</h2> : null}
        <Name className="text-2xl leading-tight font-bold text-balance shop-sm:text-3xl">
          <Link href={product.href} className="hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-shop-primary-ink">
            {product.name}
          </Link>
        </Name>
        {subtitle ? <p className="max-w-prose opacity-80">{subtitle}</p> : null}
        <StorefrontPrice priceCents={product.priceCents} compareAtPriceCents={product.compareAtPriceCents} locale={locale} size="product" showBadge={false} messages={messages} />
        {product.soldOut ? <p className="text-sm font-semibold text-shop-sale-ink">{text.soldOut}</p> : null}
        {action ? <div className="mt-2 w-full max-w-xs">{action}</div> : null}
      </div>
    </div>
  )
}
