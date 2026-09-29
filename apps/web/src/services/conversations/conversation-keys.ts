/**
 * The conversations' query keys, one tree per side, so an event invalidates a whole side at once —
 * lists, unread counts and one order's conversation alike. The hooks that read them join with the
 * conversation's screens (BEELINK-162, BEELINK-163); the channel invalidates them from today.
 */
export const conversationKeys = {
  all: ["conversations"] as const,
  shop: (slug: string) => [...conversationKeys.all, "shop", slug] as const,
  shopper: (slug: string) => [...conversationKeys.all, "shopper", slug] as const,
  shopList: (slug: string, query: object) => [...conversationKeys.shop(slug), "list", query] as const,
  shopUnread: (slug: string) => [...conversationKeys.shop(slug), "unread"] as const,
  shopOrder: (slug: string, number: number) => [...conversationKeys.shop(slug), "order", number] as const,
}
