import "server-only"

// Next
import { cookies } from "next/headers"

// Types
import type { CustomerOrderListQuery, CustomerOrderPage } from "@harness-monorepo/contracts"

// App
import { callApi } from "./api"
import { CUSTOMER_ACCESS_COOKIE } from "./customer-session-cookies"

/**
 * The signed-in shopper's orders at this shop, one page of them, or null for a visitor and for a
 * read that failed. Read with the access cookie, per request and never cached: the list is theirs
 * alone and changes under them. An expired token reads as a visitor here, as `shopperAt` does; the
 * proxy renews it on the next page.
 */
export async function customerOrdersAt(slug: string, query: CustomerOrderListQuery = {}): Promise<CustomerOrderPage | null> {
  const accessToken = (await cookies()).get(CUSTOMER_ACCESS_COOKIE)?.value
  if (!accessToken) return null

  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(query)) if (value !== undefined && value !== "") search.set(key, String(value))
  const path = `/stores/${encodeURIComponent(slug)}/customer/orders${search.size ? `?${search.toString()}` : ""}`

  const response = await callApi({ path, method: "GET", accessToken }).catch(() => null)
  return response?.ok ? ((await response.json()) as CustomerOrderPage) : null
}
