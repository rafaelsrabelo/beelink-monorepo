/**
 * The conversations' query keys, one tree per side, so an event invalidates a whole side at once —
 * lists and one order's conversation alike. The shop's unread counts are the panel's counts
 * (`panelCountsKeys`, BEELINK-309), invalidated beside it. The real-time channel invalidates
 * `shopper(slug)` and `shop(slug)` whole, so every key below nests under one of them.
 */
export const conversationKeys = {
  all: ["conversations"] as const,
  shop: (slug: string) => [...conversationKeys.all, "shop", slug] as const,
  shopper: (slug: string) => [...conversationKeys.all, "shopper", slug] as const,
  shopList: (slug: string, query: object) => [...conversationKeys.shop(slug), "list", query] as const,
  shopOrder: (slug: string, number: number) => [...conversationKeys.shop(slug), "order", number] as const,
  shopperList: (slug: string) => [...conversationKeys.shopper(slug), "list"] as const,
  shopperOrder: (slug: string, number: number) => [...conversationKeys.shopper(slug), "order", number] as const,
}
