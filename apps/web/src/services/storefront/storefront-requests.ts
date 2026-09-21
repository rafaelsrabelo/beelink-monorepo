// Types
import type { PublicProductCard } from "@harness-monorepo/contracts"

export interface StorefrontSearchResult {
  products: PublicProductCard[]
  /** How many the shop has altogether, so the list can offer "see all N". */
  total: number
}

/**
 * What the shop's search box shows while someone types.
 *
 * It asks this app's own handler and never the API — the browser reaching the API directly is the
 * one thing the BFF rule exists to stop, and a shop window is no exception to it just because it
 * carries no token.
 */
export async function searchStorefront(slug: string, term: string): Promise<StorefrontSearchResult> {
  const response = await fetch(
    `/api/storefront/${encodeURIComponent(slug)}/search?q=${encodeURIComponent(term)}`,
    { headers: { accept: "application/json" } },
  )

  // A suggestion list that failed is an empty list. Someone mid-word does not want an error under
  // the field they are typing in, and the form underneath still works.
  if (!response.ok) return { products: [], total: 0 }

  return (await response.json()) as StorefrontSearchResult
}
