// Types
import type {
  AffiliateProgramOverview,
  AffiliateProgramPayload,
  CommissionProductRate,
  CommissionProductRatePayload,
  CommissionTable,
  CommissionTablePayload,
} from "@harness-monorepo/contracts"

/** What a failed call carries: the API's stable code, never a sentence (apps/web/AGENTS.md, rule 9). */
export class AffiliateError extends Error {
  constructor(readonly errorCode: string) {
    super(errorCode)
    this.name = "AffiliateError"
  }
}

/** Declared on every call: `refuseCrossOrigin` answers 415 to a request that does not say it speaks JSON. */
const JSON_HEADERS: Record<string, string> = { "content-type": "application/json" }

async function ask<T>(path: string, method: "GET" | "POST" | "PUT" | "DELETE" = "GET", body?: object): Promise<T> {
  const response = await fetch(path, { method, headers: JSON_HEADERS, ...(body !== undefined ? { body: JSON.stringify(body) } : {}) })
  // A delete answers 204 with nothing to read.
  if (response.status === 204) return undefined as T
  const payload: unknown = await response.json().catch(() => null)
  if (!response.ok || payload === null) {
    throw new AffiliateError(typeof payload === "object" && payload !== null && "errorCode" in payload ? String(payload.errorCode) : "UNKNOWN")
  }
  return payload as T
}

const program = (slug: string) => `/api/stores/${encodeURIComponent(slug)}/affiliate-program`
const table = (slug: string, tableId: string) => `${program(slug)}/tables/${encodeURIComponent(tableId)}`

/** The rules, the tables and the month's periods, through this app's own handler; the API's address is server-only. */
export function fetchAffiliateProgram(slug: string): Promise<AffiliateProgramOverview> {
  return ask(program(slug))
}

export function saveAffiliateProgram(slug: string, payload: AffiliateProgramPayload): Promise<AffiliateProgramOverview> {
  return ask(program(slug), "PUT", payload)
}

export function fetchCommissionTable(slug: string, tableId: string): Promise<CommissionTable> {
  return ask(table(slug, tableId))
}

export function createCommissionTable(slug: string, payload: CommissionTablePayload): Promise<CommissionTable> {
  return ask(`${program(slug)}/tables`, "POST", payload)
}

export function updateCommissionTable(slug: string, tableId: string, payload: CommissionTablePayload): Promise<CommissionTable> {
  return ask(table(slug, tableId), "PUT", payload)
}

export function deleteCommissionTable(slug: string, tableId: string): Promise<void> {
  return ask(table(slug, tableId), "DELETE")
}

/** A product's own rate on a table, or — with null — back to the table's. */
export function saveProductCommission(slug: string, tableId: string, productId: string, rateBps: number | null): Promise<CommissionProductRate | undefined> {
  const path = `${table(slug, tableId)}/rates/${encodeURIComponent(productId)}`
  return rateBps === null ? ask<undefined>(path, "DELETE") : ask<CommissionProductRate>(path, "PUT", { rateBps } satisfies CommissionProductRatePayload)
}
