// Types
import type { PublicProductReviews, PublicReviewListQuery, ReviewRating } from "@harness-monorepo/contracts"
import { PRODUCT_REVIEWS_ID } from "@harness-monorepo/ui/blocks/storefront/storefront-product-reviews"
import type { StorefrontReviewSummaryRow } from "@harness-monorepo/ui/blocks/storefront/storefront-review-summary"

// App
import { paramOf } from "./storefront-routes"
import type { SectionQuery } from "./storefront-section"

/** The reviews' place in the product's address: a rating and a page, beside the combination chosen. */
export const PRODUCT_REVIEW_KEYS = { rating: "nota", page: "pagina-avaliacoes" } as const
const ANCHOR = `#${PRODUCT_REVIEWS_ID}`
/** The API's own page ceiling (`REVIEWS_PAGE_MAX`). */
const PAGE_MAX = 10_000

export interface ProductReviewsAddress {
  rating: ReviewRating | undefined
  page: number
}

export function productReviewsAddressOf(query: SectionQuery): ProductReviewsAddress {
  const rating = Number(paramOf(query[PRODUCT_REVIEW_KEYS.rating]))
  const page = Number(paramOf(query[PRODUCT_REVIEW_KEYS.page]))
  return {
    rating: Number.isInteger(rating) && rating >= 1 && rating <= 5 ? (rating as ReviewRating) : undefined,
    page: Number.isInteger(page) && page > 1 ? Math.min(page, PAGE_MAX) : 1,
  }
}

export function productReviewsQueryOf(address: ProductReviewsAddress): PublicReviewListQuery {
  return { ...(address.rating ? { rating: address.rating } : {}), ...(address.page > 1 ? { page: address.page } : {}) }
}

/**
 * The product's address with the reviews' part replaced, every other part kept — the combination
 * chosen among them — landing on the section. A changed rating starts at page one.
 */
export function productReviewsHrefOf(path: string, query: SectionQuery, next: Partial<ProductReviewsAddress>): string {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(query)) {
    if (key === PRODUCT_REVIEW_KEYS.rating || key === PRODUCT_REVIEW_KEYS.page) continue
    for (const one of Array.isArray(value) ? value : value === undefined ? [] : [value]) search.append(key, one)
  }
  const current = productReviewsAddressOf(query)
  const rating = "rating" in next ? next.rating : current.rating
  const page = "page" in next ? (next.page ?? 1) : 1
  if (rating) search.set(PRODUCT_REVIEW_KEYS.rating, String(rating))
  if (page > 1) search.set(PRODUCT_REVIEW_KEYS.page, String(page))
  return `${path}${search.size ? `?${search.toString()}` : ""}${ANCHOR}`
}

/** The histogram's five rows, five stars first, each in whole percent of every review. */
export function summaryRowsOf(reviews: PublicProductReviews, path: string, query: SectionQuery, chosen: ReviewRating | undefined): StorefrontReviewSummaryRow[] {
  const { count, histogram } = reviews.summary
  return ([5, 4, 3, 2, 1] as const).map((stars) => ({
    stars,
    // A rating some reviews have never reads 0%, which would say none.
    percent: histogram[stars] > 0 ? Math.max(1, Math.round((histogram[stars] / count) * 100)) : 0,
    href: productReviewsHrefOf(path, query, { rating: stars }),
    active: chosen === stars,
  }))
}

/** The day it was written — "30 de set. de 2026" — in the shop's time zone. */
export function reviewDayOf(iso: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, { day: "numeric", month: "short", year: "numeric", timeZone: "America/Sao_Paulo" }).format(new Date(iso))
}
