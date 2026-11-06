import "server-only"

// React
import { cache } from "react"

// Next
import { cookies } from "next/headers"

// Types
import type { CustomerProfile, CustomerPurchase } from "@harness-monorepo/contracts"

// App
import { callApi } from "./api"
import { CUSTOMER_ACCESS_COOKIE } from "./customer-session-cookies"

/**
 * The signed-in shopper at this shop — their record there — or null for a visitor.
 *
 * Read once per request, however many parts of the page ask (`cache`), and only when the shopper's
 * access cookie is there: an anonymous visitor and a crawler cost nothing. An expired token reads
 * as a visitor here; the proxy renews it on the next page, and a Server Component cannot store a
 * new pair, so it never tries to.
 */
export const shopperAt = cache(async (slug: string): Promise<CustomerProfile | null> => {
  const accessToken = (await cookies()).get(CUSTOMER_ACCESS_COOKIE)?.value
  if (!accessToken) return null

  const response = await callApi({ path: `/stores/${encodeURIComponent(slug)}/customer/me`, method: "GET", accessToken }).catch(() => null)

  return response?.ok ? ((await response.json()) as CustomerProfile) : null
})

/**
 * A visitor's purchase session at this shop (plan 2026-11-06--P0-checkout-sem-codigo) — what they typed at
 * the checkout — or null. Read only where `shopperAt` found nobody: the same cookie holds either a
 * shopper's access or a visitor's session, and the account's door refuses a visitor's.
 */
export const purchaseAt = cache(async (slug: string): Promise<CustomerPurchase | null> => {
  const accessToken = (await cookies()).get(CUSTOMER_ACCESS_COOKIE)?.value
  if (!accessToken) return null
  const response = await callApi({ path: `/stores/${encodeURIComponent(slug)}/customer/purchase`, method: "GET", accessToken }).catch(() => null)
  return response?.ok ? ((await response.json()) as CustomerPurchase) : null
})
