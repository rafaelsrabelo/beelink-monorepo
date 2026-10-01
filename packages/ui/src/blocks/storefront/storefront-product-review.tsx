// Libs
import { StarIcon } from "lucide-react"

// Locales
import { defaultMessages, format } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

export interface StorefrontProductReviewProps {
  authorName: string
  rating: number
  comment: string | null
  /** "Sabor: Uva", the combination bought; null for a product without options. */
  variantLabel: string | null
  /** The day it was written, as the screen writes days. */
  date: string
  messages?: UiMessages
}

/**
 * One review on the product's page (5b): the author's initial and name, the stars read as one
 * sentence, when, which combination, and that it was bought — every review is, since only those the
 * shop delivered to may write one — then the words.
 */
export function StorefrontProductReview({ authorName, rating, comment, variantLabel, date, messages = defaultMessages }: StorefrontProductReviewProps) {
  const text = messages.storefront

  return (
    <article className="flex flex-col gap-2 border-b border-shop-line pb-5">
      <div className="flex items-center gap-2.5">
        <span aria-hidden="true" className="flex size-9 items-center justify-center rounded-full bg-shop-fill text-sm font-semibold">
          {Array.from(authorName)[0]?.toUpperCase()}
        </span>
        <span className="text-sm font-semibold">{authorName}</span>
      </div>
      {/* The number in text: the rating colour on white is under 3:1, so the stars only repeat it. */}
      <p className="flex items-center gap-1.5">
        <span aria-hidden="true" className="text-sm font-bold">
          {rating}
        </span>
        <span aria-hidden="true" className="flex items-center gap-0.5 text-shop-rating">
          {[1, 2, 3, 4, 5].map((star) => (
            <StarIcon key={star} className="size-4" fill={star <= rating ? "currentColor" : "none"} strokeWidth={1.4} />
          ))}
        </span>
        <span className="sr-only">{format(text.reviewRatedLabel, { rating: String(rating) })}</span>
      </p>
      <p className="text-[13px] text-shop-muted">
        {[format(text.productReviewsOn, { date }), variantLabel].filter(Boolean).join(" · ")} · <b className="font-semibold text-shop-positive-ink">{text.productReviewsVerified}</b>
      </p>
      {comment ? <p className="text-sm leading-[1.55] whitespace-pre-line">{comment}</p> : null}
    </article>
  )
}
