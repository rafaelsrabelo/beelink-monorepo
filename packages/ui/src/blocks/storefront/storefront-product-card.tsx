// Block
import { AnchorLink, type LinkComponent } from "../auth/auth-link"
import { StorefrontPrice } from "./storefront-price"

// Locales
import { defaultMessages } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

export interface StorefrontProduct {
  id: string
  slug: string
  name: string
  priceCents: number
  compareAtPriceCents: number | null
  imageUrl: string | null
}

export interface StorefrontProductCardProps {
  product: StorefrontProduct
  /** Built by the screen: a block never knows that a product lives under `/<shop>/<word>/<slug>`. */
  href: string
  locale: string
  showPrice?: boolean
  showBadge?: boolean
  linkComponent?: LinkComponent
  messages?: UiMessages
}

/**
 * One product, as a window lists it.
 *
 * The whole card is the link, not a button inside it: a card where only part of it is clickable
 * teaches a visitor that clicking it does nothing, and they stop trying.
 */
export function StorefrontProductCard({
  product,
  href,
  locale,
  showPrice = true,
  showBadge = true,
  linkComponent: Link = AnchorLink,
  messages = defaultMessages,
}: StorefrontProductCardProps) {
  const text = messages.storefront

  return (
    <Link
      href={href}
      className="group flex flex-col gap-2 rounded-xl p-2 transition-colors hover:bg-black/5"
    >
      <div className="aspect-square w-full overflow-hidden rounded-lg bg-black/5">
        {product.imageUrl ? (
          <img
            src={product.imageUrl}
            alt={product.name}
            loading="lazy"
            className="size-full object-cover transition-transform group-hover:scale-105"
          />
        ) : (
          // A product with no photo yet still has a name and a price; an empty frame says so
          // without pretending an image failed to load.
          <div className="flex size-full items-center justify-center text-xs opacity-50">
            {text.noPhoto}
          </div>
        )}
      </div>

      <p className="line-clamp-2 text-sm font-medium">{product.name}</p>

      {showPrice ? (
        <StorefrontPrice
          priceCents={product.priceCents}
          compareAtPriceCents={product.compareAtPriceCents}
          locale={locale}
          showBadge={showBadge}
          messages={messages}
        />
      ) : null}
    </Link>
  )
}
