// Types
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// UI
import { StorefrontPagination } from "@harness-monorepo/ui/blocks/storefront/storefront-pagination"
import { StorefrontProductReview } from "@harness-monorepo/ui/blocks/storefront/storefront-product-review"
import { StorefrontProductReviews } from "@harness-monorepo/ui/blocks/storefront/storefront-product-reviews"
import { StorefrontReviewSummary } from "@harness-monorepo/ui/blocks/storefront/storefront-review-summary"

// App
import { AppLink } from "@/components/app-link"
import { productReviewsAddressOf, productReviewsHrefOf, productReviewsQueryOf, reviewDayOf, summaryRowsOf } from "@/lib/product-reviews-view"
import { pageCountOf, productReviewsAt } from "@/lib/storefront-data"
import type { SectionQuery } from "@/lib/storefront-section"

export interface ProductReviewsProps {
  slug: string
  productId: string
  /** The product's own address, which every link of the section keeps. */
  path: string
  query: SectionQuery
  locale: string
  messages: UiMessages
}

/**
 * 5b's last section (D14): the product's published reviews, read on the server where a crawler
 * reads them, narrowed by rating and paged in the address. A product with none, or a read that
 * failed, draws nothing — the page is the product's, and this is its last word.
 */
export async function ProductReviews({ slug, productId, path, query, locale, messages }: ProductReviewsProps) {
  const address = productReviewsAddressOf(query)
  const reviews = await productReviewsAt(slug, productId, productReviewsQueryOf(address))
  if (!reviews || reviews.summary.count === 0 || reviews.summary.average === null) return null

  const pageCount = pageCountOf(reviews.total, reviews.pageSize)

  return (
    <StorefrontProductReviews
      summary={<StorefrontReviewSummary average={reviews.summary.average} count={reviews.summary.count} rows={summaryRowsOf(reviews, path, query, address.rating)} locale={locale} linkComponent={AppLink} messages={messages} />}
      reviews={reviews.reviews.map((review) => (
        <StorefrontProductReview key={review.id} authorName={review.authorName} rating={review.rating} comment={review.comment} variantLabel={review.variantLabel} date={reviewDayOf(review.createdAt, locale)} messages={messages} />
      ))}
      {...(address.rating ? { allHref: productReviewsHrefOf(path, query, { rating: undefined }) } : {})}
      pagination={pageCount > 1 ? <StorefrontPagination page={reviews.page} pageCount={pageCount} href={(page) => productReviewsHrefOf(path, query, { page })} linkComponent={AppLink} messages={messages} /> : undefined}
      linkComponent={AppLink}
      messages={messages}
    />
  )
}
