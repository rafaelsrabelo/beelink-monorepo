// React
import type { ReactNode } from "react"

// Block
import { AnchorLink, type LinkComponent } from "../auth/auth-link"
import { StorefrontDiscountBadge, StorefrontPrice } from "./storefront-price"

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
  /** Whether it sells combinations: known on a shelf, and what decides a card's action. */
  hasOptions?: boolean
}

export interface StorefrontProductCardProps {
  product: StorefrontProduct
  /** Built by the screen: a block never knows that a product lives under `/<shop>/<word>/<slug>`. */
  href: string
  locale: string
  showPrice?: boolean
  showBadge?: boolean
  /** Under the price, above the card's link: the web's "Adicionar ao carrinho". */
  action?: ReactNode
  /**
   * `compact` is 5b's related card: the whole card one link with no frame, a 180px photo, the name in
   * the link colour and the price as one string. No badge and no action: it is a suggestion, and
   * the product's own page is where buying happens.
   */
  density?: "default" | "compact"
  linkComponent?: LinkComponent
  messages?: UiMessages
}

/**
 * One product, as a window lists it — the card 5a draws, everywhere a product is a card: the
 * home's grids and rails, the catalogue, a category, the search.
 *
 * A bordered `<article>` with the photo flush at the top and the words under it. The name is the
 * one link, and it stretches over the whole card: a card where only part of it is clickable
 * teaches a visitor that clicking it does nothing, and they stop trying — while a photo that is a
 * second link to the same place is the same product read twice to a screen reader. Anything the
 * card later gains of its own (a rating's link, a button) sits above the stretched link.
 *
 * No hover zoom on the photo: the photos will move on their own once a card can pass through
 * them, and a zoom that fights a swipe is worse than none.
 */
export function StorefrontProductCard({
  product,
  href,
  locale,
  showPrice = true,
  showBadge = true,
  action,
  density = "default",
  linkComponent: Link = AnchorLink,
  messages = defaultMessages,
}: StorefrontProductCardProps) {
  const text = messages.storefront

  if (density === "compact") {
    return (
      // Relative, so the price's screen-reader text is placed inside the card: positioned against
      // an ancestor outside the rail's scroller, it escapes the clip and widens the page.
      // The focus ring drawn inside: a rail's scroller clips whatever falls outside the card.
      <Link href={href} className="relative flex h-full flex-col gap-1.5 text-shop-on-background focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-shop-primary-ink">
        <span className="block h-[180px] overflow-hidden rounded-[12px] bg-shop-placeholder">
          {/* Decorative, as on the full card: the name right under it says what it is. */}
          {product.imageUrl ? <img src={product.imageUrl} alt="" loading="lazy" decoding="async" className="size-full object-cover" /> : null}
        </span>
        <span className="line-clamp-2 text-[14px] leading-[1.35] text-shop-primary-ink">{product.name}</span>
        {showPrice ? (
          <StorefrontPrice priceCents={product.priceCents} compareAtPriceCents={product.compareAtPriceCents} locale={locale} size="compact" className="leading-[1.2]" messages={messages} />
        ) : null}
      </Link>
    )
  }

  return (
    <article className="relative flex h-full flex-col overflow-hidden rounded-xl border border-shop-line bg-shop-background">
      <div className="relative aspect-[259/230] w-full overflow-hidden bg-shop-placeholder">
        {product.imageUrl ? (
          <img
            src={product.imageUrl}
            // Decorative on purpose: the title sits right below, so naming the photograph after
            // the product makes a screen reader read the same name twice per card.
            alt=""
            loading="lazy"
            className="size-full object-cover"
          />
        ) : (
          // A product with no photo yet still has a name and a price; an empty frame says so
          // without pretending an image failed to load.
          <div className="flex size-full items-center justify-center text-xs text-shop-muted">{text.noPhoto}</div>
        )}
        {/* The saving over the photo, as 5a draws it, and never without a real one. */}
        {showBadge ? (
          <StorefrontDiscountBadge priceCents={product.priceCents} compareAtPriceCents={product.compareAtPriceCents} messages={messages} />
        ) : null}
      </div>

      <div className="flex flex-1 flex-col gap-1.5 p-3.5">
        {/* Clamped to two lines: the DOM keeps the whole name, so a reader hears all of it. */}
        <Link
          href={href}
          className="line-clamp-2 min-h-10 text-[15px] leading-[1.35] font-medium text-shop-on-background after:absolute after:inset-0 after:content-['']"
        >
          {product.name}
        </Link>

        {showPrice ? (
          <StorefrontPrice
            priceCents={product.priceCents}
            compareAtPriceCents={product.compareAtPriceCents}
            locale={locale}
            size="card"
            messages={messages}
          />
        ) : null}

        {/* Above the name's stretched link, so a press on it is the action's and not the page's. */}
        {action ? <div className="relative z-10 mt-auto pt-1.5">{action}</div> : null}
      </div>
    </article>
  )
}
