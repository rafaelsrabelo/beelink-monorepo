// Types
import type { AffiliateDocumentPayload, AffiliateDocumentUpload, AffiliateDocumentView, ShopAffiliate } from "@harness-monorepo/contracts"

// App
import { AffiliateError, ask } from "./affiliate-requests"

const documentOf = (slug: string, affiliateId: string) => `/api/stores/${encodeURIComponent(slug)}/affiliates/${encodeURIComponent(affiliateId)}/document`

/**
 * One photo or PDF of a document (12/11/2026), kept privately and waiting a day to be named by the
 * invite or the record. No `content-type` is set: the browser writes the multipart boundary itself.
 */
export async function stageAffiliateDocument(slug: string, file: File): Promise<AffiliateDocumentUpload> {
  const body = new FormData()
  body.append("file", file)
  const response = await fetch(`/api/stores/${encodeURIComponent(slug)}/affiliate-documents`, { method: "POST", body })
  const payload: unknown = await response.json().catch(() => null)
  if (!response.ok || typeof payload !== "object" || payload === null || !("id" in payload)) {
    throw new AffiliateError(typeof payload === "object" && payload !== null && "errorCode" in payload ? String(payload.errorCode) : "UNKNOWN")
  }
  return payload as AffiliateDocumentUpload
}

/** The document's photos at links that work for ten minutes — the shop's owner alone. */
export function fetchAffiliateDocument(slug: string, affiliateId: string): Promise<AffiliateDocumentView> {
  return ask(documentOf(slug, affiliateId))
}

export function replaceAffiliateDocument(slug: string, affiliateId: string, payload: AffiliateDocumentPayload): Promise<ShopAffiliate> {
  return ask(documentOf(slug, affiliateId), "PUT", payload)
}
