// Types
import type { DeliverySettings, DeliverySettingsPayload } from "@harness-monorepo/contracts"

/** What a failed call carries: the API's stable code, never a sentence (apps/web/AGENTS.md, rule 9). */
export class DeliveryError extends Error {
  constructor(readonly errorCode: string) {
    super(errorCode)
    this.name = "DeliveryError"
  }
}

/** Declared on every call: `refuseCrossOrigin` answers 415 to a request that does not say it speaks JSON. */
const JSON_HEADERS: Record<string, string> = { "content-type": "application/json" }

async function ask<T>(path: string, method: "GET" | "PUT" = "GET", body?: object): Promise<T> {
  const response = await fetch(path, { method, headers: JSON_HEADERS, ...(body !== undefined ? { body: JSON.stringify(body) } : {}) })
  const payload: unknown = await response.json().catch(() => null)
  if (!response.ok || payload === null) {
    throw new DeliveryError(typeof payload === "object" && payload !== null && "errorCode" in payload ? String(payload.errorCode) : "UNKNOWN")
  }
  return payload as T
}

const delivery = (slug: string) => `/api/stores/${encodeURIComponent(slug)}/delivery`

export function fetchDeliverySettings(slug: string): Promise<DeliverySettings> {
  return ask(delivery(slug))
}

export function saveDeliverySettings(slug: string, payload: DeliverySettingsPayload): Promise<DeliverySettings> {
  return ask(delivery(slug), "PUT", payload)
}
