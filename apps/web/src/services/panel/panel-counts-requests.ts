// Types
import type { PanelCounts } from "@harness-monorepo/contracts"

/** What a failed call carries: the API's stable code, never a sentence (apps/web/AGENTS.md, rule 9). */
export class PanelCountsError extends Error {
  constructor(readonly errorCode: string) {
    super(errorCode)
    this.name = "PanelCountsError"
  }
}

/** Declared on every call: `refuseCrossOrigin` answers 415 to a request that does not say it speaks JSON. */
const JSON_HEADERS: Record<string, string> = { "content-type": "application/json" }

/** Every count the panel's menu shows, through this app's own handler; the API's address is server-only. */
export async function fetchPanelCounts(slug: string): Promise<PanelCounts> {
  const response = await fetch(`/api/stores/${encodeURIComponent(slug)}/panel-counts`, { method: "GET", headers: JSON_HEADERS })
  const payload: unknown = await response.json().catch(() => null)
  if (!response.ok || payload === null) {
    throw new PanelCountsError(typeof payload === "object" && payload !== null && "errorCode" in payload ? String(payload.errorCode) : "UNKNOWN")
  }
  return payload as PanelCounts
}
