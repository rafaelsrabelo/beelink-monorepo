/** The affiliate's own query keys (IMPULSEIA-108): the account's shops, and each shop's pages, dropped together when their data changes. */
export const affiliateAreaKeys = {
  all: ["affiliate-area"] as const,
  shops: () => [...affiliateAreaKeys.all, "shops"] as const,
  shop: (slug: string) => [...affiliateAreaKeys.all, "shop", slug] as const,
  home: (slug: string) => [...affiliateAreaKeys.shop(slug), "home"] as const,
  products: (slug: string, page: number, q: string) => [...affiliateAreaKeys.shop(slug), "products", page, q] as const,
  orders: (slug: string, page: number) => [...affiliateAreaKeys.shop(slug), "orders", page] as const,
  statement: (slug: string, page: number) => [...affiliateAreaKeys.shop(slug), "statement", page] as const,
  payouts: (slug: string, page: number) => [...affiliateAreaKeys.shop(slug), "payouts", page] as const,
}
