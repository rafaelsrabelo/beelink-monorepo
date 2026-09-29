import "server-only"

// React
import { cache } from "react"

// Next
import { cookies } from "next/headers"

// Types
import type { CustomerOrder, CustomerOrderListQuery, CustomerOrderPage } from "@harness-monorepo/contracts"

// App
import { callApi } from "./api"
import { CUSTOMER_ACCESS_COOKIE } from "./customer-session-cookies"

/** A GET under the shopper's orders with their access cookie, or null with no cookie or no good answer. */
async function readAsShopper<T>(path: string): Promise<T | null> {
  const accessToken = (await cookies()).get(CUSTOMER_ACCESS_COOKIE)?.value
  if (!accessToken) return null

  const response = await callApi({ path, method: "GET", accessToken }).catch(() => null)
  return response?.ok ? ((await response.json()) as T) : null
}

// Once per request for each address: the menu's count, the overview and the tab's toolbar and list
// ask the same page, and `cache` compares its arguments by identity — so they arrive as a string.
const readOrders = cache((slug: string, search: string) =>
  readAsShopper<CustomerOrderPage>(`/stores/${encodeURIComponent(slug)}/customer/orders${search ? `?${search}` : ""}`),
)

const readOrder = cache((slug: string, number: number) => readAsShopper<CustomerOrder>(`/stores/${encodeURIComponent(slug)}/customer/orders/${number}`))

/**
 * The signed-in shopper's orders at this shop, one page of them, or null when they could not be
 * read — which a screen says as such, never as an empty list. Read per request with the access
 * cookie and never kept past it: the list is theirs alone and changes under them.
 */
export function customerOrdersAt(slug: string, query: CustomerOrderListQuery = {}): Promise<CustomerOrderPage | null> {
  const entries = Object.entries(query)
    .filter(([, value]) => value !== undefined && value !== "")
    .map(([key, value]) => [key, String(value)] as [string, string])
    .sort(([a], [b]) => a.localeCompare(b))
  return readOrders(slug, new URLSearchParams(entries).toString())
}

/** One of the shopper's orders, with its timeline and where it goes; null when it could not be read. */
export function customerOrderAt(slug: string, number: number): Promise<CustomerOrder | null> {
  return readOrder(slug, number)
}
