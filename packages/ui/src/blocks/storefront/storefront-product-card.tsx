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
            // Decorative on purpose: the title sits right below, so naming the photograph after
            // the product makes a screen reader read the same name twice per card.
            alt=""
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

      <div className="relative">
        <p className="line-clamp-2 text-sm font-medium">{product.name}</p>

        {/*
          The title is clamped to two lines, so a long one ends mid-word and the card stops
          answering "which one is this?". The tooltip is the rest of the name.

          It is aria-hidden on purpose: line-clamp truncates the picture, not the DOM, so a
          screen reader already reads the whole name — announcing it twice would be noise.
          That also keeps the card renderable on the server: a CSS-only reveal costs the
          catalogue grid no hydration, which a Base UI tooltip on every card would.
        */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute bottom-full left-0 z-10 mb-1 w-max max-w-64 rounded-md px-2 py-1 text-xs opacity-0 shadow-sm transition-opacity group-focus-visible:opacity-100 [@media(hover:hover)]:group-hover:opacity-100"
          style={{ backgroundColor: "var(--shop-text)", color: "var(--shop-on-text)" }}
        >
          {product.name}
        </span>
      </div>

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
