// Types
import type { ReviewRating, StoreReview, StoreReviewListQuery, StoreReviewStatus } from "@harness-monorepo/contracts"
import type { ReviewListRow } from "@harness-monorepo/ui/blocks/reviews/review-list"

/** The panel's reviews' address, in the panel's own words: `estado`, `nota`, `produto` and `pagina`. */
export const SHOP_REVIEW_KEYS = { status: "estado", rating: "nota", product: "produto", page: "pagina" } as const

const STATUS_WORDS: Record<string, StoreReviewStatus> = { publicadas: "PUBLISHED", ocultas: "HIDDEN" }
export const STATUS_WORD_OF: Record<StoreReviewStatus, string> = { PUBLISHED: "publicadas", HIDDEN: "ocultas" }
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
/** The API's own page ceiling (`REVIEWS_PAGE_MAX`): past it the read is refused. */
const PAGE_MAX = 10_000

export interface ShopReviewsAddress {
  status: StoreReviewStatus | undefined
  rating: ReviewRating | undefined
  productId: string | undefined
  page: number
}

/** What the address says; an unknown status, rating or product is none, and a bad page the first. */
export function shopReviewsAddressOf(search: Pick<URLSearchParams, "get">): ShopReviewsAddress {
  const status = search.get(SHOP_REVIEW_KEYS.status) ?? ""
  const rating = Number(search.get(SHOP_REVIEW_KEYS.rating))
  const productId = search.get(SHOP_REVIEW_KEYS.product) ?? ""
  const page = Number(search.get(SHOP_REVIEW_KEYS.page))

  return {
    status: Object.hasOwn(STATUS_WORDS, status) ? STATUS_WORDS[status] : undefined,
    rating: Number.isInteger(rating) && rating >= 1 && rating <= 5 ? (rating as ReviewRating) : undefined,
    productId: UUID.test(productId) ? productId.toLowerCase() : undefined,
    page: Number.isInteger(page) && page > 1 ? Math.min(page, PAGE_MAX) : 1,
  }
}

/** What the API is asked, from the address. */
export function shopReviewsQueryOf(address: ShopReviewsAddress): StoreReviewListQuery {
  return {
    ...(address.status ? { status: address.status } : {}),
    ...(address.rating ? { rating: address.rating } : {}),
    ...(address.productId ? { productId: address.productId } : {}),
    ...(address.page > 1 ? { page: address.page } : {}),
  }
}

/** The list's address with `next` applied; a changed filter starts at page one, and defaults stay out. */
export function shopReviewsHrefOf(slug: string, address: ShopReviewsAddress, next: Partial<ShopReviewsAddress>): string {
  const merged = { ...address, ...next, page: "page" in next ? (next.page ?? 1) : 1 }
  const search = new URLSearchParams()
  if (merged.status) search.set(SHOP_REVIEW_KEYS.status, STATUS_WORD_OF[merged.status])
  if (merged.rating) search.set(SHOP_REVIEW_KEYS.rating, String(merged.rating))
  if (merged.productId) search.set(SHOP_REVIEW_KEYS.product, merged.productId)
  if (merged.page > 1) search.set(SHOP_REVIEW_KEYS.page, String(merged.page))
  return `/admin/${slug}/reviews${search.size ? `?${search.toString()}` : ""}`
}

/** "30 set 2026", the day it was written, in the shop's time zone. */
function dayOf(iso: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, { day: "numeric", month: "short", year: "numeric", timeZone: "America/Sao_Paulo" }).format(new Date(iso))
}

/** The list's rows, each product's name narrowing the list to it. */
export function shopReviewRowsOf(reviews: readonly StoreReview[], slug: string, address: ShopReviewsAddress, locale: string): ReviewListRow[] {
  return reviews.map((review) => ({
    id: review.id,
    rating: review.rating,
    comment: review.comment,
    productName: review.product.name,
    productHref: shopReviewsHrefOf(slug, address, { productId: review.product.id }),
    customerName: review.customer.name,
    date: dayOf(review.createdAt, locale),
    hidden: review.hidden,
  }))
}
