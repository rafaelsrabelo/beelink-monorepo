// Types
import type { AffiliateApplicationApproval, AffiliateApplicationStatus, AffiliatePageOverview, AffiliatePagePayload, ShopAffiliateApplication, ShopAffiliateApplicationPage } from "@harness-monorepo/contracts"

// App
import { ask } from "./affiliate-requests"

/*
  The shop's "Seja afiliado" page and its applications (plan 2026-11-14), through this app's own
  handlers: the API's address is server-only. A failure throws the API's code (`AffiliateError`).
*/

const page = (slug: string) => `/api/stores/${encodeURIComponent(slug)}/affiliate-page`
const applications = (slug: string) => `/api/stores/${encodeURIComponent(slug)}/affiliate-applications`

export function fetchAffiliatePage(slug: string): Promise<AffiliatePageOverview> {
  return ask(page(slug))
}

export function saveAffiliatePage(slug: string, payload: AffiliatePagePayload): Promise<AffiliatePageOverview> {
  return ask(page(slug), "PUT", payload)
}

export function fetchAffiliateApplications(slug: string, status: AffiliateApplicationStatus, pageNumber: number): Promise<ShopAffiliateApplicationPage> {
  return ask(`${applications(slug)}?${new URLSearchParams({ status, page: String(pageNumber) }).toString()}`)
}

/** An application decided: approved on a table — the page's, when none is named — or refused. */
export function decideAffiliateApplication(slug: string, applicationId: string, decision: { act: "approve"; approval: AffiliateApplicationApproval } | { act: "refuse" }): Promise<ShopAffiliateApplication> {
  const path = `${applications(slug)}/${encodeURIComponent(applicationId)}/${decision.act}`
  return decision.act === "approve" ? ask(path, "POST", decision.approval) : ask(path, "POST", {})
}
