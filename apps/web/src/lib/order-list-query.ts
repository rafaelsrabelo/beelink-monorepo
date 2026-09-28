// Types
import type { CustomerOrderListQuery, CustomerOrderSituation } from "@harness-monorepo/contracts"

// App
import { PAGE_KEY, pageOf, paramOf } from "./storefront-routes"
import type { SectionQuery } from "./storefront-section"

/**
 * The list's address, in the shop's language like the shelf's (`pagina`): `situacao`, `periodo` and
 * `q`. The tab words are what a person reads in the URL; the API's own names stay behind them.
 */
export const ORDER_LIST_KEYS = { situation: "situacao", period: "periodo", search: "q", page: PAGE_KEY } as const

const SITUATION_WORDS: Record<string, CustomerOrderSituation> = {
  "em-andamento": "ACTIVE",
  entregues: "DELIVERED",
  cancelados: "CANCELLED",
}

export const SITUATION_WORD_OF: Record<CustomerOrderSituation, string> = { ACTIVE: "em-andamento", DELIVERED: "entregues", CANCELLED: "cancelados" }

/** The list's query as the address carries it: an unknown situation or period is the whole list. */
export interface OrderListQuery {
  situation: CustomerOrderSituation | undefined
  /** `3m` or a year, as the API takes it; undefined is every period. */
  period: string | undefined
  search: string
  page: number
}

export function orderListQueryOf(query: SectionQuery): OrderListQuery {
  const situationWord = paramOf(query[ORDER_LIST_KEYS.situation])
  const period = paramOf(query[ORDER_LIST_KEYS.period])

  return {
    situation: situationWord ? SITUATION_WORDS[situationWord] : undefined,
    period: period && /^(3m|20\d{2})$/.test(period) ? period : undefined,
    search: paramOf(query[ORDER_LIST_KEYS.search]) ?? "",
    page: pageOf(query[ORDER_LIST_KEYS.page]),
  }
}

/** What the API is asked, from what the address said. */
export function orderListApiQueryOf(query: OrderListQuery): CustomerOrderListQuery {
  return {
    ...(query.situation ? { situation: query.situation } : {}),
    ...(query.period ? { period: query.period } : {}),
    ...(query.search ? { q: query.search } : {}),
    ...(query.page > 1 ? { page: query.page } : {}),
  }
}

/** The address entries of a query, with `patch` applied — a changed tab or filter starts at page one. */
export function orderListEntriesOf(query: OrderListQuery, patch: Partial<OrderListQuery> = {}): Record<string, string | undefined> {
  const next = { ...query, ...patch, page: "page" in patch ? (patch.page ?? 1) : 1 }

  return {
    [ORDER_LIST_KEYS.situation]: next.situation ? SITUATION_WORD_OF[next.situation] : undefined,
    [ORDER_LIST_KEYS.period]: next.period,
    [ORDER_LIST_KEYS.search]: next.search || undefined,
    [ORDER_LIST_KEYS.page]: next.page > 1 ? String(next.page) : undefined,
  }
}

/** Whether the address narrows the list at all: what an empty result says depends on it. */
export function isFiltered(query: OrderListQuery): boolean {
  return Boolean(query.situation || query.period || query.search)
}
