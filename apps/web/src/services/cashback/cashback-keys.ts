/** The panel's cashback query keys: one shop's rules, and its customers' credit, invalidated together. */
export const cashbackKeys = {
  all: ["shop-cashback"] as const,
  shop: (slug: string) => [...cashbackKeys.all, slug] as const,
  overview: (slug: string) => [...cashbackKeys.shop(slug), "overview"] as const,
  customers: (slug: string) => [...cashbackKeys.shop(slug), "customers"] as const,
  customer: (slug: string, customerId: string, page: number) => [...cashbackKeys.customers(slug), customerId, page] as const,
}
