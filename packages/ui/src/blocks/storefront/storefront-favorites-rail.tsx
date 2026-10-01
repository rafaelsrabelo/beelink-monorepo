// React
import { useId } from "react"

// Locales
import { defaultMessages, format } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import { AnchorLink, type LinkComponent } from "../auth/auth-link"
import { formatCents } from "./storefront-price"

export interface StorefrontFavoritesRailItem {
  productId: string
  href: string
  name: string
  imageUrl: string | null
  /** Today's price of what was liked. */
  priceCents: number
  /** How much cheaper than when it was liked; 0 when it is not. */
  dropCents: number
  soldOut: boolean
}

export interface StorefrontFavoritesRailProps {
  /** The first few, most recently liked first. */
  items: readonly StorefrontFavoritesRailItem[]
  /** Every favourite, and how many of them got cheaper: the line under the title. */
  total: number
  dropped: number
  /** The Favoritos tab. */
  allHref: string
  locale: string
  currency?: string
  linkComponent?: LinkComponent
  messages?: UiMessages
}

/**
 * "Seus favoritos" on the account's front (6c): a row of the products liked last, each with today's
 * price and how much it dropped, and the way to all of them. Compact on purpose — the tab's card,
 * with its actions, is the place to act on one.
 */
export function StorefrontFavoritesRail({ items, total, dropped, allHref, locale, currency = "BRL", linkComponent: Link = AnchorLink, messages = defaultMessages }: StorefrontFavoritesRailProps) {
  const text = messages.storefront
  const headingId = useId()
  const counted = total === 1 ? text.favoritesRailCountOne : format(text.favoritesRailCountMany, { count: String(total) })
  const cheaper = dropped === 1 ? text.favoritesRailDroppedOne : format(text.favoritesRailDroppedMany, { count: String(dropped) })

  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-3">
      <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-1">
        <div className="flex flex-col gap-0.5">
          <h2 id={headingId} className="text-lg font-extrabold">
            {text.favoritesRailTitle}
          </h2>
          <p className="text-sm text-shop-muted">{dropped > 0 ? `${counted} · ${cheaper}` : counted}</p>
        </div>
        <Link href={allHref} className="py-2 text-sm font-semibold text-shop-primary-ink hover:underline">
          {format(text.overviewSeeAll, { count: String(total) })}
        </Link>
      </div>
      <ul className="-mx-1 flex snap-x gap-3 overflow-x-auto px-1 pb-2">
        {items.map((item) => (
          <li key={item.productId} className="w-40 shrink-0 snap-start">
            <Link href={item.href} className="group flex flex-col gap-1.5">
              <span className="aspect-square overflow-hidden rounded-xl bg-shop-placeholder">
                {/* Decorative: the name under it says what it is. */}
                {item.imageUrl ? <img src={item.imageUrl} alt="" loading="lazy" className="size-full object-cover" /> : null}
              </span>
              <span className="line-clamp-2 text-sm font-medium group-hover:underline">{item.name}</span>
              <span className="text-sm font-bold">{formatCents(item.priceCents, locale, currency)}</span>
              {item.dropCents > 0 ? (
                <span className="w-fit rounded-full bg-shop-sale px-2 py-0.5 text-xs font-semibold text-shop-on-sale">
                  {format(text.favoritesRailDrop, { amount: formatCents(item.dropCents, locale, currency) })}
                </span>
              ) : null}
              {item.soldOut ? <span className="text-xs text-shop-muted">{text.favoriteSoldOut}</span> : null}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
