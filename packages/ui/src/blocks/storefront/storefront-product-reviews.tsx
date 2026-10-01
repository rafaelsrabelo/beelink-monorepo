// React
import type { ReactNode } from "react"

// Locales
import { defaultMessages } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import { AnchorLink, type LinkComponent } from "../auth/auth-link"

/** Where the rating line under the title lands, and the histogram's links come back to. */
export const PRODUCT_REVIEWS_ID = "avaliacoes"

export interface StorefrontProductReviewsProps {
  /** The average, the count and the histogram. */
  summary: ReactNode
  /** The reviews of the page, newest first; none when the rating chosen has none. */
  reviews: readonly ReactNode[]
  /** Under a rating's filter: the way back to every rating. */
  allHref?: string
  /** The pages, when there is more than one. */
  pagination?: ReactNode
  /** Why the list is empty: none with the rating chosen, or a page past the last. */
  empty?: "rating" | "page"
  linkComponent?: LinkComponent
  messages?: UiMessages
}

/** 5b's last section, `#avaliacoes`: the summary in a column of its own beside the reviews. */
export function StorefrontProductReviews({ summary, reviews, allHref, pagination, empty = "rating", linkComponent: Link = AnchorLink, messages = defaultMessages }: StorefrontProductReviewsProps) {
  const text = messages.storefront

  return (
    <section id={PRODUCT_REVIEWS_ID} aria-labelledby={`${PRODUCT_REVIEWS_ID}-title`} className="flex scroll-mt-[calc(var(--shop-masthead-height,117px)+16px)] flex-col gap-8 border-t border-shop-line pt-7 pb-12 shop-lg:flex-row shop-lg:gap-14">
      <div className="flex shrink-0 flex-col gap-3 shop-lg:w-[300px]">
        <h2 id={`${PRODUCT_REVIEWS_ID}-title`} className="text-[22px] font-extrabold">
          {text.productReviewsTitle}
        </h2>
        {summary}
      </div>
      <div className="flex min-w-0 grow flex-col gap-5">
        {allHref ? (
          <Link href={allHref} className="inline-flex min-h-9 w-fit items-center rounded-full border border-shop-line-strong px-3.5 text-sm font-semibold">
            {text.productReviewsAll}
          </Link>
        ) : null}
        {reviews.length > 0 ? reviews : <p className="text-sm text-shop-muted">{empty === "rating" ? text.productReviewsNoneForRating : text.productReviewsNonePage}</p>}
        {pagination}
      </div>
    </section>
  )
}
