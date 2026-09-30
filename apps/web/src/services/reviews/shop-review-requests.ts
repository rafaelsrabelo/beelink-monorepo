// Types
import type { SetReviewVisibilityPayload, StoreReview, StoreReviewListQuery, StoreReviewPage, StoreReviewsUnseen } from "@harness-monorepo/contracts"

/** What a failed call carries: the API's stable code, never a sentence (apps/web/AGENTS.md, rule 9). */
export class ShopReviewError extends Error {
  constructor(readonly errorCode: string) {
    super(errorCode)
    this.name = "ShopReviewError"
  }
}

/** Declared on every call: `refuseCrossOrigin` answers 415 to a request that does not say it speaks JSON. */
const JSON_HEADERS: Record<string, string> = { "content-type": "application/json" }

async function ask<T>(path: string, init: { method: "GET" | "POST" | "PATCH"; body?: string } = { method: "GET" }): Promise<T> {
  const response = await fetch(path, { method: init.method, headers: JSON_HEADERS, ...(init.body !== undefined ? { body: init.body } : {}) })
  if (response.status === 204) return undefined as T
  const payload: unknown = await response.json().catch(() => null)
  if (!response.ok || payload === null) {
    throw new ShopReviewError(typeof payload === "object" && payload !== null && "errorCode" in payload ? String(payload.errorCode) : "UNKNOWN")
  }
  return payload as T
}

const base = (slug: string) => `/api/stores/${encodeURIComponent(slug)}/reviews`

/** A page of the shop's reviews, through this app's own handler; the API's address is server-only. */
export function fetchShopReviews(slug: string, query: StoreReviewListQuery = {}): Promise<StoreReviewPage> {
  const search = new URLSearchParams(Object.entries(query).flatMap(([key, value]) => (value === undefined ? [] : [[key, String(value)]])))
  return ask(`${base(slug)}${search.size ? `?${search.toString()}` : ""}`)
}

export function fetchShopReviewsUnseen(slug: string): Promise<StoreReviewsUnseen> {
  return ask(`${base(slug)}/unseen`)
}

export function markShopReviewsSeen(slug: string): Promise<void> {
  return ask(`${base(slug)}/seen`, { method: "POST", body: "{}" })
}

export function setShopReviewVisibility(slug: string, reviewId: string, payload: SetReviewVisibilityPayload): Promise<StoreReview> {
  return ask(`${base(slug)}/${encodeURIComponent(reviewId)}`, { method: "PATCH", body: JSON.stringify(payload) })
}
