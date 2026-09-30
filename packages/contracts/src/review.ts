/**
 * A product's reviews (BEELINK-156): one per customer and product, from someone the shop delivered
 * it to — a rating of 1 to 5, a comment of up to 1000 characters, the combination bought. Published
 * unless the shopkeeper hid it.
 *
 * Three doors: the shop window reads the published ones (`/stores/:slug/products/:productId/reviews`),
 * the shopper writes theirs (`/stores/:slug/customer/reviews`), the shopkeeper hides and publishes
 * (`/stores/:slug/reviews`).
 */

export type ReviewRating = 1 | 2 | 3 | 4 | 5;

/** A product's published reviews in two numbers: the average to one decimal, and how many. */
export interface ProductRatingSummary {
  average: number;
  count: number;
}

/** One published review as the shop window shows it. */
export interface PublicReview {
  id: string;
  rating: ReviewRating;
  comment: string | null;
  /** "Rafael S.": the first name and the last one's initial — "Cliente" once the account is gone. */
  authorName: string;
  /** "Sabor: Uva", the combination bought; null for a product without options. */
  variantLabel: string | null;
  /** ISO-8601, when it was written. */
  createdAt: string;
}

/**
 * A page of a product's published reviews, the most recent first, with the whole product's
 * summary — the average, the count and how many of each rating — whatever the page or the filter.
 */
export interface PublicProductReviews {
  /** The average is null while there is none. */
  summary: { average: number | null; count: number; histogram: Record<ReviewRating, number> };
  reviews: PublicReview[];
  total: number;
  page: number;
  pageSize: number;
}

export interface PublicReviewListQuery {
  /** Only this rating. */
  rating?: ReviewRating;
  page?: number;
  pageSize?: number;
}

/** A product the shop delivered to the shopper that they have not rated yet. */
export interface CustomerPendingReview {
  productId: string;
  slug: string;
  name: string;
  imageUrl: string | null;
  /** The combination in the latest delivered order with it, by when that order was placed. */
  variantLabel: string | null;
  orderNumber: number;
  /** ISO-8601, when that order was delivered. */
  deliveredAt: string;
}

/** A review the shopper wrote, to read and to edit. */
export interface CustomerReview {
  id: string;
  productId: string;
  slug: string;
  name: string;
  imageUrl: string | null;
  rating: ReviewRating;
  comment: string | null;
  variantLabel: string | null;
  /** The shop hid it: the shopper still sees it, the shop window does not. */
  hidden: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateReviewPayload {
  productId: string;
  rating: ReviewRating;
  /** Up to 1000 characters; blank is none. */
  comment?: string | null;
}

export interface UpdateReviewPayload {
  rating: ReviewRating;
  /** Absent keeps the comment; null or blank removes it. */
  comment?: string | null;
}

/** A review as the shopkeeper reads it: with the product and the customer, by their whole name. */
export interface StoreReview {
  id: string;
  rating: ReviewRating;
  comment: string | null;
  variantLabel: string | null;
  product: { id: string; name: string; slug: string };
  customer: { id: string; name: string };
  hidden: boolean;
  createdAt: string;
  updatedAt: string;
}

export type StoreReviewStatus = "PUBLISHED" | "HIDDEN";

export interface StoreReviewListQuery {
  rating?: ReviewRating;
  productId?: string;
  /** Absent is both. */
  status?: StoreReviewStatus;
  page?: number;
  pageSize?: number;
}

/** A page of the shop's reviews, the most recent first; the counts follow the rating and the product, not the status. */
export interface StoreReviewPage {
  reviews: StoreReview[];
  total: number;
  page: number;
  pageSize: number;
  counts: Record<"ALL" | StoreReviewStatus, number>;
}

export interface SetReviewVisibilityPayload {
  hidden: boolean;
}

/** What the reviews answer; the apps own the sentences. */
export type ReviewErrorCode =
  /** The shop never delivered this product to this shopper. */
  | "CUSTOMER_REVIEW_NOT_ELIGIBLE"
  /** The shopper already rated it: they edit that one. */
  | "CUSTOMER_REVIEW_EXISTS"
  /** Not a review of this shopper's at this shop. */
  | "CUSTOMER_REVIEW_NOT_FOUND"
  /** Not a review of this shop's. */
  | "REVIEW_NOT_FOUND";
