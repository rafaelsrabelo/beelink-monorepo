/** The panel's affiliate query keys: one shop's programme and its tables, invalidated together. */
export const affiliateKeys = {
  all: ["shop-affiliates"] as const,
  shop: (slug: string) => [...affiliateKeys.all, slug] as const,
  program: (slug: string) => [...affiliateKeys.shop(slug), "program"] as const,
  table: (slug: string, tableId: string) => [...affiliateKeys.shop(slug), "table", tableId] as const,
}
