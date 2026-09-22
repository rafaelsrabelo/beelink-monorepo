// Types
import type { Banner, CreateBannerPayload, ReorderPayload, UpdateBannerPayload } from "@harness-monorepo/contracts"

/**
 * What a failed call carries: the API's stable code, never a sentence. The screen turns the code
 * into copy in the reader's language (apps/web/AGENTS.md).
 */
export class BannerRequestError extends Error {
  constructor(readonly errorCode: string) {
    super(errorCode)
    this.name = "BannerRequestError"
  }
}

/**
 * Declared on every call, a bodyless read included: `refuseCrossOrigin` answers 415 to a request
 * that does not say it speaks JSON, which is what makes a form posted from another site unable to
 * reach these handlers at all.
 */
const JSON_HEADERS: Record<string, string> = { "content-type": "application/json" }

function errorCodeOf(payload: unknown): string {
  return typeof payload === "object" && payload !== null && "errorCode" in payload
    ? String((payload as { errorCode: unknown }).errorCode)
    : "UNKNOWN"
}

/** Every path here is this app's own route handler; the API's address is server-only. */
async function call<T>(path: string, init: RequestInit): Promise<T> {
  const response = await fetch(path, { headers: JSON_HEADERS, ...init })
  const payload: unknown = await response.json().catch(() => null)

  if (!response.ok) throw new BannerRequestError(errorCodeOf(payload))

  return payload as T
}

const bannersPath = (slug: string) => `/api/stores/${encodeURIComponent(slug)}/banners`

export function fetchBanners(slug: string): Promise<Banner[]> {
  return call<Banner[]>(bannersPath(slug), { method: "GET" })
}

export function createBanner(slug: string, payload: CreateBannerPayload): Promise<Banner> {
  return call<Banner>(bannersPath(slug), { method: "POST", body: JSON.stringify(payload) })
}

export function updateBanner(slug: string, bannerId: string, payload: UpdateBannerPayload): Promise<Banner> {
  return call<Banner>(`${bannersPath(slug)}/${encodeURIComponent(bannerId)}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  })
}

export function deleteBanner(slug: string, bannerId: string): Promise<unknown> {
  return call<unknown>(`${bannersPath(slug)}/${encodeURIComponent(bannerId)}`, { method: "DELETE" })
}

/**
 * The whole list, in the new order. The API refuses a partial one, which is what stops two banners
 * ending up on the same position and drawing a page that is neither order.
 */
export function reorderBanners(slug: string, payload: ReorderPayload): Promise<Banner[]> {
  return call<Banner[]>(`${bannersPath(slug)}/reorder`, { method: "PUT", body: JSON.stringify(payload) })
}
