/** The panel's reviews' query keys: one shop's lists. Its count of new ones is one of the panel's counts (`panelCountsKeys`). */
export const shopReviewKeys = {
  all: ["shop-reviews"] as const,
  shop: (slug: string) => [...shopReviewKeys.all, slug] as const,
  list: (slug: string, query: object) => [...shopReviewKeys.shop(slug), "list", query] as const,
}
