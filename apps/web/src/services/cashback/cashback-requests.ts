// Types
import type { CashbackAdjustmentPayload, CashbackOverview, CashbackSettingsPayload, CustomerCashback } from "@harness-monorepo/contracts"

/** What a failed call carries: the API's stable code, never a sentence (apps/web/AGENTS.md, rule 9). */
export class CashbackError extends Error {
  constructor(readonly errorCode: string) {
    super(errorCode)
    this.name = "CashbackError"
  }
}

/** Declared on every call: `refuseCrossOrigin` answers 415 to a request that does not say it speaks JSON. */
const JSON_HEADERS: Record<string, string> = { "content-type": "application/json" }

async function ask<T>(path: string, method: "GET" | "POST" | "PUT" = "GET", body?: object): Promise<T> {
  const response = await fetch(path, { method, headers: JSON_HEADERS, ...(body !== undefined ? { body: JSON.stringify(body) } : {}) })
  const payload: unknown = await response.json().catch(() => null)
  if (!response.ok || payload === null) {
    throw new CashbackError(typeof payload === "object" && payload !== null && "errorCode" in payload ? String(payload.errorCode) : "UNKNOWN")
  }
  return payload as T
}

const shop = (slug: string) => `/api/stores/${encodeURIComponent(slug)}`
const customer = (slug: string, customerId: string) => `${shop(slug)}/customers/${encodeURIComponent(customerId)}/cashback`

/** The rules and what the shop owes, through this app's own handler; the API's address is server-only. */
export function fetchCashback(slug: string): Promise<CashbackOverview> {
  return ask(`${shop(slug)}/cashback`)
}

export function saveCashback(slug: string, payload: CashbackSettingsPayload): Promise<CashbackOverview> {
  return ask(`${shop(slug)}/cashback`, "PUT", payload)
}

export function fetchCustomerCashback(slug: string, customerId: string, page: number): Promise<CustomerCashback> {
  return ask(`${customer(slug, customerId)}${page > 1 ? `?page=${page}` : ""}`)
}

export function adjustCustomerCashback(slug: string, customerId: string, payload: CashbackAdjustmentPayload): Promise<CustomerCashback> {
  return ask(`${customer(slug, customerId)}/adjustments`, "POST", payload)
}
