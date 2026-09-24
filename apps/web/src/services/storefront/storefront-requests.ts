// Types
import type { CreateRestockRequestPayload, PublicProductCard } from "@harness-monorepo/contracts"

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

/** A visitor's "Avise-me" for one sold-out combination. Anonymous; the handler forwards the address. */
export async function sendRestockRequest(
  slug: string,
  productId: string,
  payload: CreateRestockRequestPayload,
): Promise<void> {
  const response = await fetch(
    `/api/storefront/${encodeURIComponent(slug)}/products/${encodeURIComponent(productId)}/restock-requests`,
    { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) },
  )

  if (!response.ok) {
    const answer: unknown = await response.json().catch(() => null)
    throw new RestockRequestError(
      typeof answer === "object" && answer !== null && "errorCode" in answer ? String(answer.errorCode) : "UNKNOWN",
    )
  }
}

/** What a refused request carries: the API's stable code, never a sentence. */
export class RestockRequestError extends Error {
  constructor(readonly errorCode: string) {
    super(errorCode)
    this.name = "RestockRequestError"
  }
}
