// Types
import type { SalesByOriginQuery, SalesByOriginReport } from "@harness-monorepo/contracts"

/** What a failed call carries: the API's stable code, never a sentence (apps/web/AGENTS.md, rule 9). */
export class ReportRequestError extends Error {
  constructor(readonly errorCode: string) {
    super(errorCode)
    this.name = "ReportRequestError"
  }
}

/** Declared on every call: `refuseCrossOrigin` answers 415 to a request that does not say it speaks JSON. */
const JSON_HEADERS: Record<string, string> = { "content-type": "application/json" }

function errorCodeOf(payload: unknown): string {
  return typeof payload === "object" && payload !== null && "errorCode" in payload ? String((payload as { errorCode: unknown }).errorCode) : "UNKNOWN"
}

/** The shop's sales in a period, by origin. The path is this app's own route handler; the API's address is server-only. */
export async function fetchSalesByOrigin(slug: string, query: Required<SalesByOriginQuery>): Promise<SalesByOriginReport> {
  const search = new URLSearchParams({ from: query.from, to: query.to })
  const response = await fetch(`/api/stores/${encodeURIComponent(slug)}/reports/sales-by-origin?${search.toString()}`, { method: "GET", headers: JSON_HEADERS })
  const payload: unknown = await response.json().catch(() => null)
  if (!response.ok) throw new ReportRequestError(errorCodeOf(payload))

  return payload as SalesByOriginReport
}
