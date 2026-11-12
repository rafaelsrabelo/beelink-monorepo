// Types
import type {
  AffiliateHome,
  AffiliateOrderPage,
  AffiliatePayoutPage,
  AffiliateProductPage,
  AffiliateProfile,
  AffiliateProfilePayload,
  AffiliateShop,
  AffiliateStatement,
} from "@harness-monorepo/contracts"

// App
import { ask } from "@/services/affiliates/affiliate-requests"

const area = "/api/affiliate/stores"
const shop = (slug: string) => `${area}/${encodeURIComponent(slug)}`

/** The shops the signed-in account sells for (IMPULSEIA-108). */
export function fetchMyAffiliateShops(): Promise<AffiliateShop[]> {
  return ask(area)
}

export function fetchAffiliateHome(slug: string): Promise<AffiliateHome> {
  return ask(shop(slug))
}

export function fetchAffiliateProducts(slug: string, page: number, q: string): Promise<AffiliateProductPage> {
  const query = new URLSearchParams({ page: String(page), ...(q ? { q } : {}) })
  return ask(`${shop(slug)}/products?${query.toString()}`)
}

export function fetchAffiliateOrders(slug: string, page: number): Promise<AffiliateOrderPage> {
  return ask(`${shop(slug)}/orders?page=${page}`)
}

export function fetchMyAffiliateStatement(slug: string, page: number): Promise<AffiliateStatement> {
  return ask(`${shop(slug)}/statement?page=${page}`)
}

export function fetchAffiliatePayouts(slug: string, page: number): Promise<AffiliatePayoutPage> {
  return ask(`${shop(slug)}/payouts?page=${page}`)
}

export function saveAffiliateProfile(slug: string, payload: AffiliateProfilePayload): Promise<AffiliateProfile> {
  return ask(`${shop(slug)}/profile`, "PATCH", payload)
}
