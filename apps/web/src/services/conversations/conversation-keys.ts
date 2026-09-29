/**
 * The conversations' query keys, one tree per side, so an event invalidates a whole side at once —
 * lists, unread counts and one order's conversation alike. The real-time channel invalidates
 * `shopper(slug)` and `shop(slug)` whole, so every key below nests under one of them.
 */
export const conversationKeys = {
  all: ["conversations"] as const,
  shop: (slug: string) => [...conversationKeys.all, "shop", slug] as const,
  shopper: (slug: string) => [...conversationKeys.all, "shopper", slug] as const,
  shopperList: (slug: string) => [...conversationKeys.shopper(slug), "list"] as const,
  shopperOrder: (slug: string, number: number) => [...conversationKeys.shopper(slug), "order", number] as const,
}
