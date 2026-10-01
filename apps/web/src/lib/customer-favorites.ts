import "server-only"

// React
import { cache } from "react"

// Types
import type { CustomerFavoriteListQuery, CustomerFavoritePage } from "@harness-monorepo/contracts"

// App
import { readAsShopper } from "./shopper-read"

// Once per request for each address: the menu's count, the tab's toolbar and its list ask the same
// page, and `cache` compares its arguments by identity — so they arrive as a string.
const readFavorites = cache((slug: string, search: string) =>
  readAsShopper<CustomerFavoritePage>(`/stores/${encodeURIComponent(slug)}/customer/favorites${search ? `?${search}` : ""}`),
)

/**
 * The signed-in shopper's favourites at this shop, one page of them priced as of now, or null when
 * they could not be read. Theirs alone, so read per request with the access cookie.
 */
export function customerFavoritesAt(slug: string, query: CustomerFavoriteListQuery = {}): Promise<CustomerFavoritePage | null> {
  const entries = Object.entries(query)
    .filter(([, value]) => value !== undefined)
    .map(([key, value]) => [key, String(value)] as [string, string])
    .sort(([a], [b]) => a.localeCompare(b))
  return readFavorites(slug, new URLSearchParams(entries).toString())
}
