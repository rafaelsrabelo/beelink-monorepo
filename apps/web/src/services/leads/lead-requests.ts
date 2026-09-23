// Types
import type { CreateLeadPayload, Lead, LeadListQuery, LeadPage, LeadStatus } from "@harness-monorepo/contracts"

/** What a failed call carries: the API's stable code, never a sentence (apps/web/AGENTS.md, rule 9). */
export class LeadRequestError extends Error {
  constructor(readonly errorCode: string) {
    super(errorCode)
    this.name = "LeadRequestError"
  }
}

/** Declared on every call: `refuseCrossOrigin` answers 415 to a request that does not say it speaks JSON. */
const JSON_HEADERS: Record<string, string> = { "content-type": "application/json" }

function errorCodeOf(payload: unknown): string {
  return typeof payload === "object" && payload !== null && "errorCode" in payload
    ? String((payload as { errorCode: unknown }).errorCode)
    : "UNKNOWN"
}

/** Every path here is this app's own route handler; the API's address is server-only. */
async function call<T>(path: string, init: RequestInit): Promise<T> {
  const response = await fetch(path, { headers: JSON_HEADERS, ...init })
  const payload: unknown = response.status === 204 ? null : await response.json().catch(() => null)

  if (!response.ok) throw new LeadRequestError(errorCodeOf(payload))

  return payload as T
}

const leadsPath = (slug: string) => `/api/stores/${encodeURIComponent(slug)}/leads`

/** A visitor sends a site's form. Anonymous: the handler forwards the address, never a token. */
export async function sendLead(slug: string, payload: CreateLeadPayload): Promise<void> {
  await call<null>(`/api/storefront/${encodeURIComponent(slug)}/contact`, {
    method: "POST",
    body: JSON.stringify(payload),
  })
}

export function fetchLeads(slug: string, query: LeadListQuery = {}): Promise<LeadPage> {
  const search = new URLSearchParams()
  if (query.status) search.set("status", query.status)
  if (query.page && query.page > 1) search.set("page", String(query.page))
  if (query.pageSize) search.set("pageSize", String(query.pageSize))

  return call<LeadPage>(`${leadsPath(slug)}${search.size ? `?${search.toString()}` : ""}`, { method: "GET" })
}

export function updateLeadStatus(slug: string, leadId: string, status: LeadStatus): Promise<Lead> {
  return call<Lead>(`${leadsPath(slug)}/${encodeURIComponent(leadId)}`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  })
}

export async function deleteLead(slug: string, leadId: string): Promise<void> {
  await call<null>(`${leadsPath(slug)}/${encodeURIComponent(leadId)}`, { method: "DELETE" })
}
