/** The panel's reviews' query keys: one shop's lists and its count of new ones, invalidated together. */
export const shopReviewKeys = {
  all: ["shop-reviews"] as const,
  shop: (slug: string) => [...shopReviewKeys.all, slug] as const,
  list: (slug: string, query: object) => [...shopReviewKeys.shop(slug), "list", query] as const,
  unseen: (slug: string) => [...shopReviewKeys.shop(slug), "unseen"] as const,
}
