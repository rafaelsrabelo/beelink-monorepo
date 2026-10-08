// Types
import type { CustomDomainOverview, SaveCustomDomainPayload } from "@harness-monorepo/contracts"

/** What a failed call carries: the API's stable code, never a sentence (apps/web/AGENTS.md, rule 9). */
export class CustomDomainRequestError extends Error {
  constructor(readonly errorCode: string) {
    super(errorCode)
    this.name = "CustomDomainRequestError"
  }
}

/** Declared on every call: `refuseCrossOrigin` answers 415 to a request that does not say it speaks JSON. */
const JSON_HEADERS: Record<string, string> = { "content-type": "application/json" }

async function ask<T>(path: string, method: "GET" | "POST" | "PUT" | "DELETE" = "GET", body?: object): Promise<T> {
  const response = await fetch(path, { method, headers: JSON_HEADERS, ...(body !== undefined ? { body: JSON.stringify(body) } : {}) })
  const payload: unknown = await response.json().catch(() => null)
  if (!response.ok || payload === null) {
    throw new CustomDomainRequestError(typeof payload === "object" && payload !== null && "errorCode" in payload ? String(payload.errorCode) : "UNKNOWN")
  }
  return payload as T
}

const customDomain = (slug: string) => `/api/stores/${encodeURIComponent(slug)}/custom-domain`

export function fetchCustomDomain(slug: string): Promise<CustomDomainOverview> {
  return ask(customDomain(slug))
}

/** Saves the domain as it was pasted: the answer is the domain as the API read it, already checked once. */
export function saveCustomDomain(slug: string, payload: SaveCustomDomainPayload): Promise<CustomDomainOverview> {
  return ask(customDomain(slug), "PUT", payload)
}

/** The saved domain checked again, now: the domain as it then stands, and what the check found. */
export function checkCustomDomain(slug: string): Promise<CustomDomainOverview> {
  return ask(`${customDomain(slug)}/check`, "POST", {})
}

export function removeCustomDomain(slug: string): Promise<object> {
  return ask(customDomain(slug), "DELETE")
}
