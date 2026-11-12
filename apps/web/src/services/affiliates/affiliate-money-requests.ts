// Types
import type {
  AffiliateAdjustmentPayload,
  AffiliateOwed,
  AffiliatePayoutPayload,
  AffiliateStatement,
  OrderAffiliate,
  OrderAffiliatePayload,
  ShopAffiliate,
} from "@harness-monorepo/contracts"

// App
import { ask } from "./affiliate-requests"

const store = (slug: string) => `/api/stores/${encodeURIComponent(slug)}`
const affiliate = (slug: string, affiliateId: string) => `${store(slug)}/affiliates/${encodeURIComponent(affiliateId)}`

/** Whom an order is credited to, its commission and every change of it (IMPULSEIA-107). */
export function fetchOrderAffiliate(slug: string, number: number): Promise<OrderAffiliate> {
  return ask(`${store(slug)}/orders/${number}/affiliate`)
}

export function changeOrderAffiliate(slug: string, number: number, payload: OrderAffiliatePayload): Promise<OrderAffiliate> {
  return ask(`${store(slug)}/orders/${number}/affiliate`, "PUT", payload)
}

export function fetchAffiliateStatement(slug: string, affiliateId: string, page: number): Promise<AffiliateStatement> {
  return ask(`${affiliate(slug, affiliateId)}/statement?page=${page}`)
}

export function adjustAffiliate(slug: string, affiliateId: string, payload: AffiliateAdjustmentPayload): Promise<AffiliateStatement> {
  return ask(`${affiliate(slug, affiliateId)}/adjustments`, "POST", payload)
}

export function payAffiliate(slug: string, affiliateId: string, payload: AffiliatePayoutPayload): Promise<AffiliateStatement> {
  return ask(`${affiliate(slug, affiliateId)}/payouts`, "POST", payload)
}

export function fetchAffiliateOwed(slug: string): Promise<AffiliateOwed> {
  return ask(`${store(slug)}/affiliate-program/owed`)
}

/** What the shop window shows of the affiliate, taken off: their photo, or their phrase. */
export function clearAffiliateShowcase(slug: string, affiliateId: string, field: "photo" | "tagline"): Promise<ShopAffiliate> {
  return ask(`${affiliate(slug, affiliateId)}/${field}`, "DELETE")
}
