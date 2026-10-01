// Types
import type { CustomerFavorite, CustomerFavoriteFilter, CustomerFavoriteListQuery, CustomerFavoriteSort } from "@harness-monorepo/contracts"

// App
import { PAGE_KEY, pageOf, paramOf } from "./storefront-routes"
import type { SectionQuery } from "./storefront-section"

/**
 * Favoritos' address, in the shop's language like Meus pedidos' (`situacao`, `pagina`): `filtro` and
 * `ordem`. The words are what a person reads in the URL; the API's own names stay behind them.
 */
export const FAVORITE_LIST_KEYS = { filter: "filtro", sort: "ordem", page: PAGE_KEY } as const

/** The heart's way back from signing in: the product to like on arrival, and its combination. */
export const LIKE_ON_RETURN_KEYS = { product: "curtir", variant: "curtir-variante" } as const

/** A remove's word under the shared `aviso`, and the key a refused one comes back under. */
export const FAVORITE_REMOVED = "favorito-removido"
export const FAVORITES_ERROR_KEY = "erro-favoritos"

export const FILTER_WORD_OF: Record<CustomerFavoriteFilter, string> = { PRICE_DROPPED: "baixou", ON_SALE: "promocao", SOLD_OUT: "esgotados" }
export const SORT_WORD_OF: Record<CustomerFavoriteSort, string> = { RECENT: "recentes", PRICE_ASC: "menor-preco", DISCOUNT: "maior-desconto" }

const FILTER_WORDS = Object.fromEntries(Object.entries(FILTER_WORD_OF).map(([filter, word]) => [word, filter])) as Record<string, CustomerFavoriteFilter>
const SORT_WORDS = Object.fromEntries(Object.entries(SORT_WORD_OF).map(([sort, word]) => [word, sort])) as Record<string, CustomerFavoriteSort>

/** How many favourites the API keeps for one shopper (`FAVORITES_MAX`), which the refusal of one more says. */
export const FAVORITES_MAX = 200

/** The API's own ceiling (`FAVORITES_PAGE_MAX`): past it the read is refused, so a far page is cut to it. */
export const FAVORITES_PAGE_MAX = 200

/** The list's query as the address carries it: an unknown filter is all of them, an unknown order the default. */
export interface FavoriteListQuery {
  filter: CustomerFavoriteFilter | undefined
  sort: CustomerFavoriteSort
  page: number
}

export function favoriteListQueryOf(query: SectionQuery): FavoriteListQuery {
  const filterWord = paramOf(query[FAVORITE_LIST_KEYS.filter])
  const sortWord = paramOf(query[FAVORITE_LIST_KEYS.sort])

  return {
    filter: filterWord && Object.hasOwn(FILTER_WORDS, filterWord) ? FILTER_WORDS[filterWord] : undefined,
    sort: sortWord && Object.hasOwn(SORT_WORDS, sortWord) ? SORT_WORDS[sortWord]! : "RECENT",
    page: Math.min(pageOf(query[FAVORITE_LIST_KEYS.page]), FAVORITES_PAGE_MAX),
  }
}

/** What the API is asked, from what the address said. */
export function favoriteListApiQueryOf(query: FavoriteListQuery): CustomerFavoriteListQuery {
  return {
    ...(query.filter ? { filter: query.filter } : {}),
    ...(query.sort !== "RECENT" ? { sort: query.sort } : {}),
    ...(query.page > 1 ? { page: query.page } : {}),
  }
}

/** The address entries of a query, with `patch` applied — a changed filter or order starts at page one. */
export function favoriteListEntriesOf(query: FavoriteListQuery, patch: Partial<FavoriteListQuery> = {}): Record<string, string | undefined> {
  const next = { ...query, ...patch, page: "page" in patch ? (patch.page ?? 1) : 1 }

  return {
    [FAVORITE_LIST_KEYS.filter]: next.filter ? FILTER_WORD_OF[next.filter] : undefined,
    [FAVORITE_LIST_KEYS.sort]: next.sort !== "RECENT" ? SORT_WORD_OF[next.sort] : undefined,
    [FAVORITE_LIST_KEYS.page]: next.page > 1 ? String(next.page) : undefined,
  }
}

/**
 * The "before" struck beside today's price: the dearest the shopper saw — what they liked it at,
 * when it dropped since, or the shop's "de". The same number the API sorts "Maior desconto" by.
 */
export function beforeCentsOf(favorite: Pick<CustomerFavorite, "priceCents" | "compareAtPriceCents" | "likedPriceCents" | "priceDropCents">): number | null {
  const before = Math.max(favorite.priceDropCents > 0 ? favorite.likedPriceCents : 0, favorite.compareAtPriceCents ?? 0)
  return before > favorite.priceCents ? before : null
}
