import "server-only"

// React
import { cache } from "react"

// Types
import type { CustomerPendingReview, CustomerReview } from "@harness-monorepo/contracts"

// App
import { readAsShopper } from "./shopper-read"

/**
 * What the shopper received and has not rated, each product once — or null when it could not be
 * read. Once per request: the menu's count and the tab ask the same list.
 */
export const pendingReviewsAt = cache((slug: string) => readAsShopper<CustomerPendingReview[]>(`/stores/${encodeURIComponent(slug)}/customer/reviews/pending`))

/** The reviews the shopper wrote at the shop, the most recent first, or null when they could not be read. */
export const shopperReviewsAt = cache((slug: string) => readAsShopper<CustomerReview[]>(`/stores/${encodeURIComponent(slug)}/customer/reviews`))
