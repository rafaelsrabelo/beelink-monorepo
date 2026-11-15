// Types
import type { AffiliateApplicationPayload } from "@harness-monorepo/contracts"

/** What a refused application carries: the API's stable code, never a sentence. */
export class AffiliateApplicationError extends Error {
  constructor(readonly errorCode: string) {
    super(errorCode)
    this.name = "AffiliateApplicationError"
  }
}

/** A visitor's application to the shop's "Seja afiliado" page (plan 2026-11-14). Anonymous; the handler forwards the address. */
export async function sendAffiliateApplication(slug: string, payload: AffiliateApplicationPayload): Promise<void> {
  const response = await fetch(`/api/storefront/${encodeURIComponent(slug)}/affiliate-applications`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) })
  if (response.ok) return

  const answer: unknown = await response.json().catch(() => null)
  throw new AffiliateApplicationError(typeof answer === "object" && answer !== null && "errorCode" in answer ? String(answer.errorCode) : "UNKNOWN")
}
