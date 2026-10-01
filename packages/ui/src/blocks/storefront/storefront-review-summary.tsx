// Utils
import { cn } from "@harness-monorepo/ui/lib/utils"

// Locales
import { defaultMessages, format } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import { AnchorLink, type LinkComponent } from "../auth/auth-link"
import { StorefrontRating } from "./storefront-rating"

export interface StorefrontReviewSummaryRow {
  stars: 1 | 2 | 3 | 4 | 5
  /** Whole percent of the reviews. */
  percent: number
  /** The list narrowed to this rating. */
  href: string
  active: boolean
}

export interface StorefrontReviewSummaryProps {
  average: number
  count: number
  /** Five stars first. */
  rows: readonly StorefrontReviewSummaryRow[]
  locale: string
  linkComponent?: LinkComponent
  messages?: UiMessages
}

/**
 * 5b's left column under the title: the average with its stars, how many, and five bars — each a
 * link that narrows the list to its rating, and read as one sentence ("5 estrelas: 78% das
 * avaliações"). The bars are drawn in the rating colour on the shop's own lines.
 */
export function StorefrontReviewSummary({ average, count, rows, locale, linkComponent: Link = AnchorLink, messages = defaultMessages }: StorefrontReviewSummaryProps) {
  const text = messages.storefront

  return (
    <div className="flex flex-col gap-3">
      <StorefrontRating average={average} count={count} locale={locale} size="product" messages={messages} />
      {/* Drawn only: the rating above already says how many to a reader. */}
      <p aria-hidden="true" className="text-sm text-shop-muted">{count === 1 ? text.productReviewsCountOne : format(text.productReviewsCountMany, { count: String(count) })}</p>
      <ul className="flex flex-col gap-1.5">
        {rows.map((row) => (
          <li key={row.stars}>
            <Link
              href={row.href}
              aria-label={format(row.stars === 1 ? text.productReviewsRowOne : text.productReviewsRowMany, { stars: String(row.stars), percent: String(row.percent) })}
              aria-current={row.active ? "true" : undefined}
              className={cn("flex min-h-8 items-center gap-2.5 rounded-md text-sm", row.active && "font-bold")}
            >
              <span aria-hidden="true" className="w-[62px] shrink-0">
                {row.stars === 1 ? text.productReviewsStarOne : format(text.productReviewsStarMany, { stars: String(row.stars) })}
              </span>
              <span aria-hidden="true" className="h-[18px] grow overflow-hidden rounded-[6px] border border-shop-line bg-shop-fill">
                <span className="block h-full bg-shop-rating" style={{ width: `${row.percent}%` }} />
              </span>
              <span aria-hidden="true" className="w-9 shrink-0 text-right tabular-nums">
                {row.percent}%
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
