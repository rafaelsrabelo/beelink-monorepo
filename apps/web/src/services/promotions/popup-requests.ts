// Types
import type { StorePopupOverview, StorePopupPayload } from "@harness-monorepo/contracts"

// App
import { DiscountError } from "./promotion-requests"

/** Declared on every call: `refuseCrossOrigin` answers 415 to a request that does not say it speaks JSON. */
const JSON_HEADERS: Record<string, string> = { "content-type": "application/json" }

async function ask(slug: string, method: "GET" | "PUT", body?: StorePopupPayload): Promise<StorePopupOverview> {
  const response = await fetch(`/api/stores/${encodeURIComponent(slug)}/popup`, { method, headers: JSON_HEADERS, ...(body !== undefined ? { body: JSON.stringify(body) } : {}) })
  const payload: unknown = await response.json().catch(() => null)
  if (!response.ok || payload === null) {
    throw new DiscountError(typeof payload === "object" && payload !== null && "errorCode" in payload ? String(payload.errorCode) : "UNKNOWN")
  }
  return payload as StorePopupOverview
}

/** The shop's first-purchase pop-up (BEELINK-306), through this app's own handler; the API's address is server-only. */
export function fetchPopup(slug: string): Promise<StorePopupOverview> {
  return ask(slug, "GET")
}

export function savePopup(slug: string, payload: StorePopupPayload): Promise<StorePopupOverview> {
  return ask(slug, "PUT", payload)
}
