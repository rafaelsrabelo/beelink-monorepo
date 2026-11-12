/** The panel's affiliate query keys: one shop's programme, its tables and its affiliates, invalidated together. */
export const affiliateKeys = {
  all: ["shop-affiliates"] as const,
  shop: (slug: string) => [...affiliateKeys.all, slug] as const,
  program: (slug: string) => [...affiliateKeys.shop(slug), "program"] as const,
  table: (slug: string, tableId: string) => [...affiliateKeys.shop(slug), "table", tableId] as const,
  /** Every page and standing of the list, dropped together when anyone in it changes. */
  people: (slug: string) => [...affiliateKeys.shop(slug), "people"] as const,
  list: (slug: string, status: string | null, page: number) => [...affiliateKeys.people(slug), "list", status ?? "ALL", page] as const,
  person: (slug: string, affiliateId: string) => [...affiliateKeys.people(slug), "one", affiliateId] as const,
}
