import "server-only"

// React
import { cache } from "react"

// Next
import { cookies } from "next/headers"

// Types
import type { CustomerProfile } from "@harness-monorepo/contracts"

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
