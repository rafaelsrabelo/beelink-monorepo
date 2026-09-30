// Types
import type { CustomerFavoriteIds, LikeFavoritePayload } from "@harness-monorepo/contracts"

/** What a refused favourite call carries: the API's stable code, never a sentence. */
export class ShopperFavoriteError extends Error {
  constructor(
    readonly errorCode: string,
    readonly status: number,
  ) {
    super(errorCode)
    this.name = "ShopperFavoriteError"
  }
}

/**
 * To the shop's own handlers (`/<slug>/api/favorites…`), where the shopper's cookies reach — never
 * the API, and never a token in page code. Every call says it speaks JSON: the handlers refuse what
 * a cross-site form could send. A like and an unlike answer 204, with nothing to read.
 */
async function ask(path: string, init: { method: "GET" | "PUT" | "DELETE"; body?: string } = { method: "GET" }): Promise<unknown> {
  const response = await fetch(path, {
    method: init.method,
    headers: { "content-type": "application/json", accept: "application/json" },
    ...(init.body !== undefined ? { body: init.body } : {}),
  }).catch(() => null)
  if (!response) throw new ShopperFavoriteError("UNKNOWN", 0)
  if (response.status === 204) return null

  const answer: unknown = await response.json().catch(() => null)
  if (!response.ok) {
    const code = typeof answer === "object" && answer !== null && "errorCode" in answer ? String(answer.errorCode) : null
    throw new ShopperFavoriteError(code ?? (response.status === 429 ? "RATE_LIMITED" : "UNKNOWN"), response.status)
  }
  return answer
}

const base = (slug: string) => `/${encodeURIComponent(slug)}/api/favorites`

/** The products the shopper liked at the shop. */
export async function fetchFavoriteIds(slug: string): Promise<CustomerFavoriteIds> {
  const answer = await ask(`${base(slug)}/ids`)
  if (answer === null) throw new ShopperFavoriteError("UNKNOWN", 204)
  return answer as CustomerFavoriteIds
}

/** Likes a product, with the combination chosen on its page or none. */
export async function likeFavorite(slug: string, productId: string, variantId: string | null): Promise<void> {
  await ask(`${base(slug)}/${encodeURIComponent(productId)}`, { method: "PUT", body: JSON.stringify({ variantId } satisfies LikeFavoritePayload) })
}

export async function unlikeFavorite(slug: string, productId: string): Promise<void> {
  await ask(`${base(slug)}/${encodeURIComponent(productId)}`, { method: "DELETE" })
}
