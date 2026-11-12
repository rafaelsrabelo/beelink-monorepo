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
  /** The links to an affiliate's document's photos (12/11/2026): read again when they are about to expire. */
  document: (slug: string, affiliateId: string) => [...affiliateKeys.people(slug), "document", affiliateId] as const,
  /** The money (IMPULSEIA-107): an affiliate's statement pages, what is owed, and an order's affiliate — dropped together when any of it moves. */
  money: (slug: string) => [...affiliateKeys.shop(slug), "money"] as const,
  statement: (slug: string, affiliateId: string, page: number) => [...affiliateKeys.money(slug), "statement", affiliateId, page] as const,
  owed: (slug: string) => [...affiliateKeys.money(slug), "owed"] as const,
  order: (slug: string, number: number) => [...affiliateKeys.money(slug), "order", number] as const,
}
