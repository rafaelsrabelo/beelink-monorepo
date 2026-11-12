// Types
import type { AffiliateProgramOverview, AffiliateProgramPayload, AffiliateStatus, CommissionCategoryRate, CommissionCategoryRatePayload, CommissionProductRate, CommissionProductRatePayload, CommissionTable, CommissionTablePayload, CreateAffiliatePayload, ShopAffiliate, ShopAffiliatePage, UpdateAffiliatePayload } from "@harness-monorepo/contracts"

/** What a failed call carries: the API's stable code, never a sentence (apps/web/AGENTS.md, rule 9). */
export class AffiliateError extends Error {
  constructor(readonly errorCode: string) {
    super(errorCode)
    this.name = "AffiliateError"
  }
}

/** Declared on every call: `refuseCrossOrigin` answers 415 to a request that does not say it speaks JSON. */
const JSON_HEADERS: Record<string, string> = { "content-type": "application/json" }

/** One call through this app's handlers, failing with the API's code. The money's requests (IMPULSEIA-107) share it. */
export async function ask<T>(path: string, method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE" = "GET", body?: object): Promise<T> {
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

/** A category's own rate on a table, or — with null — back to the table's (the user's review, 12/11/2026). */
export function saveCategoryCommission(slug: string, tableId: string, categoryId: string, rateBps: number | null): Promise<CommissionCategoryRate | undefined> {
  const path = `${table(slug, tableId)}/category-rates/${encodeURIComponent(categoryId)}`
  return rateBps === null ? ask<undefined>(path, "DELETE") : ask<CommissionCategoryRate>(path, "PUT", { rateBps } satisfies CommissionCategoryRatePayload)
}

/** A product's own rate on a table, or — with null — back to the table's. */
export function saveProductCommission(slug: string, tableId: string, productId: string, rateBps: number | null): Promise<CommissionProductRate | undefined> {
  const path = `${table(slug, tableId)}/rates/${encodeURIComponent(productId)}`
  return rateBps === null ? ask<undefined>(path, "DELETE") : ask<CommissionProductRate>(path, "PUT", { rateBps } satisfies CommissionProductRatePayload)
}

/** What the list is asked for: one standing or every one, and a page of it. */
export interface AffiliateListQuery {
  status: AffiliateStatus | null
  page: number
  /** Absent is the API's own page size; a picker of affiliates asks for the most a page holds. */
  pageSize?: number
}

/** An act on an affiliate, as the API names it. */
export type AffiliateAct = "resend" | "pause" | "resume" | "end"

const affiliates = (slug: string) => `/api/stores/${encodeURIComponent(slug)}/affiliates`
const affiliate = (slug: string, affiliateId: string) => `${affiliates(slug)}/${encodeURIComponent(affiliateId)}`

export function fetchShopAffiliates(slug: string, query: AffiliateListQuery): Promise<ShopAffiliatePage> {
  const search = new URLSearchParams({ page: String(query.page) })
  if (query.status) search.set("status", query.status)
  if (query.pageSize) search.set("pageSize", String(query.pageSize))
  return ask(`${affiliates(slug)}?${search.toString()}`)
}

export function fetchShopAffiliate(slug: string, affiliateId: string): Promise<ShopAffiliate> {
  return ask(affiliate(slug, affiliateId))
}

export function inviteAffiliate(slug: string, payload: CreateAffiliatePayload): Promise<ShopAffiliate> {
  return ask(affiliates(slug), "POST", payload)
}

export function updateAffiliate(slug: string, affiliateId: string, payload: UpdateAffiliatePayload): Promise<ShopAffiliate> {
  return ask(affiliate(slug, affiliateId), "PATCH", payload)
}

export function cancelAffiliateInvite(slug: string, affiliateId: string): Promise<void> {
  return ask(affiliate(slug, affiliateId), "DELETE")
}

export function actOnAffiliate(slug: string, affiliateId: string, act: AffiliateAct): Promise<ShopAffiliate> {
  return ask(`${affiliate(slug, affiliateId)}/${act}`, "POST")
}
