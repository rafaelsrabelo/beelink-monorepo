// Locales
import { defaultMessages, format } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"
import { cn } from "@harness-monorepo/ui/lib/utils"

// Block
import { AnchorLink, type LinkComponent } from "../auth/auth-link"

export interface StorefrontRatingProps {
  /** One decimal, 0 to 5. */
  average: number
  count: number
  /** Where "(128)" goes — the reviews section. Absent, the count is plain text. */
  reviewsHref?: string
  /** The shopper's language, for "4,7" against "4.7". */
  locale: string
  /** Card: 14px stars; product page: 16px, with the average bold. */
  size?: "card" | "product"
  linkComponent?: LinkComponent
  className?: string
  messages?: UiMessages
}

/** Five glyphs, the filled ones first. Rounded to the nearest star, as the designs draw them. */
export function starsOf(average: number): string {
  const filled = Math.max(0, Math.min(5, Math.round(average)))
  return "★".repeat(filled) + "☆".repeat(5 - filled)
}

/**
 * A rating as 5a and 5b draw it: the average, the stars in the rating colour, the count. The
 * glyphs are for the eye; a reader hears one sentence — "Nota 4,7 de 5, 128 avaliações" — from
 * text in the block, never from an `aria-label` on a `div`.
 *
 * It draws whatever it is given and knows nothing of where a rating comes from — the published
 * reviews' cache, on a card or under a product's title. Leading to the reviews, the count is the
 * link, and it carries the sentence: a keyboard reaches it, and a reader hears where it goes.
 */
export function StorefrontRating({
  average,
  count,
  reviewsHref,
  locale,
  size = "card",
  linkComponent: Link = AnchorLink,
  className,
  messages = defaultMessages,
}: StorefrontRatingProps) {
  const text = messages.storefront
  const shown = new Intl.NumberFormat(locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(average)
  const said = format(count === 1 ? text.ratingOfOne : text.ratingOf, { rating: shown, count: String(count) })

  return (
    <div className={cn("flex items-center gap-1.5", size === "card" ? "text-[13px]" : "text-sm", className)}>
      {reviewsHref ? null : <span className="sr-only">{said}</span>}
      <span aria-hidden="true" className={size === "card" ? "font-semibold" : "font-bold"}>
        {shown}
      </span>
      <span aria-hidden="true" className={cn("tracking-[1px] text-shop-rating", size === "card" ? "text-sm" : "text-base")}>
        {starsOf(average)}
      </span>
      {reviewsHref ? (
        <Link href={reviewsHref} className="text-shop-primary-ink hover:underline">
          <span aria-hidden="true">({count})</span>
          <span className="sr-only">{said}</span>
        </Link>
      ) : (
        <span aria-hidden="true">({count})</span>
      )}
    </div>
  )
}
