// React
import type { ReactNode } from "react"

// Libs
import { HeartIcon } from "lucide-react"

// Locales
import { defaultMessages, format } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import { AnchorLink, type LinkComponent } from "../auth/auth-link"
import { formatCents, StorefrontPrice } from "./storefront-price"

export interface StorefrontFavoriteCardProps {
  name: string
  /** The product's page, on the combination liked: where "Ver opções" and "avise-me" lead. */
  href: string
  imageUrl: string | null
  /** "Sabor: Uva"; null for a product liked as a whole, or one without options. */
  variantLabel: string | null
  priceCents: number
  /** The dearest "before" the shopper saw — the price liked at, or the shop's "de" — struck beside today's; null for none. */
  beforeCents: number | null
  /** How much cheaper than when it was liked; the seal shows only above zero. */
  dropCents: number
  /** The day it was liked, as the screen writes days. */
  likedOn: string
  soldOut: boolean
  /** Under the price, above the card's link: the web's "Adicionar ao carrinho". A sold-out card draws "avise-me" instead. */
  action?: ReactNode
  /** The heart that removes it: a form, so the tab works without a script. */
  remove: { action: string; fields: Readonly<Record<string, string>> }
  locale: string
  currency?: string
  linkComponent?: LinkComponent
  messages?: UiMessages
}

/**
 * One favourite as 6g draws it: the photo with the heart that removes it and the seal of what it
 * dropped, then the name, the combination, today's price beside the one it had, the day it was
 * liked and what can be done with it. The name's link stretches over the card, as a shelf's does.
 */
export function StorefrontFavoriteCard({
  name,
  href,
  imageUrl,
  variantLabel,
  priceCents,
  beforeCents,
  dropCents,
  likedOn,
  soldOut,
  action,
  remove,
  locale,
  currency = "BRL",
  linkComponent: Link = AnchorLink,
  messages = defaultMessages,
}: StorefrontFavoriteCardProps) {
  const text = messages.storefront

  return (
    <article className="relative flex h-full flex-col overflow-hidden rounded-xl border border-shop-line bg-shop-background">
      <div className="relative aspect-[259/190] w-full overflow-hidden bg-shop-placeholder">
        {/* Decorative: the name right under it says what it is. */}
        {imageUrl ? <img src={imageUrl} alt="" loading="lazy" className="size-full object-cover" /> : <div className="flex size-full items-center justify-center text-xs text-shop-muted">{text.noPhoto}</div>}

        <form method="post" action={remove.action} className="absolute top-2.5 right-2.5 z-10">
          {Object.entries(remove.fields).map(([field, value]) => (
            <input key={field} type="hidden" name={field} value={value} />
          ))}
          <button
            type="submit"
            aria-label={format(text.favoriteRemove, { name })}
            className="flex size-11 cursor-pointer items-center justify-center rounded-full border border-shop-line bg-shop-background text-shop-primary-ink shadow-sm"
          >
            <HeartIcon aria-hidden="true" className="size-5" fill="currentColor" strokeWidth={1.8} />
          </button>
        </form>

        {dropCents > 0 ? (
          <span className="absolute bottom-2.5 left-2.5 rounded-full bg-shop-positive px-2 py-1 text-xs font-bold text-shop-on-positive">
            {format(text.favoriteDrop, { amount: formatCents(dropCents, locale, currency) })}
          </span>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col gap-1.5 p-3.5">
        <Link href={href} className="line-clamp-2 min-h-10 text-[15px] leading-[1.35] font-medium text-shop-on-background after:absolute after:inset-0 after:content-['']">
          {name}
        </Link>
        {variantLabel ? <p className="text-xs text-shop-muted">{variantLabel}</p> : null}
        <StorefrontPrice priceCents={priceCents} compareAtPriceCents={beforeCents} locale={locale} currency={currency} size="card" showBadge={false} messages={messages} />
        <p className="text-xs text-shop-muted">{format(text.favoriteLikedOn, { date: likedOn })}</p>

        {/* Drawn, not a second link: a press falls through to the name's, which opens the page where "Avise-me" is. */}
        <div className="pointer-events-none relative z-10 mt-auto pt-1.5">
          {soldOut ? (
            <span className="flex h-[42px] w-full items-center justify-center gap-1 rounded-full border border-shop-line-strong bg-shop-background text-sm font-semibold">
              {text.favoriteSoldOut}
              {/* Drawn only: the press opens the page, and "Avise-me" is asked there, where a reader meets it. */}
              <span aria-hidden="true">{text.favoriteSoldOutNotify}</span>
            </span>
          ) : (
            action
          )}
        </div>
      </div>
    </article>
  )
}
