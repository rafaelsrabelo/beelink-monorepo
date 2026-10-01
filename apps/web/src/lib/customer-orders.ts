import "server-only"

// React
import { cache } from "react"

// Next
import { cookies } from "next/headers"

// Types
import type { CustomerOrder, CustomerOrderListQuery, CustomerOrderPage, CustomerReorder } from "@harness-monorepo/contracts"

// App
import { callApi } from "./api"
import { CUSTOMER_ACCESS_COOKIE } from "./customer-session-cookies"
import { readAsShopper } from "./shopper-read"

// Once per request for each address: the menu's count, the overview and the tab's toolbar and list
// ask the same page, and `cache` compares its arguments by identity — so they arrive as a string.
const readOrders = cache((slug: string, search: string) =>
  readAsShopper<CustomerOrderPage>(`/stores/${encodeURIComponent(slug)}/customer/orders${search ? `?${search}` : ""}`),
)

/** One of the shopper's orders: found, not there for them — none by that number, or someone else's — or not read. */
export type CustomerOrderRead = { status: "found"; order: CustomerOrder } | { status: "missing" } | { status: "failed" }

const readOrder = cache(async (slug: string, number: number): Promise<CustomerOrderRead> => {
  const accessToken = (await cookies()).get(CUSTOMER_ACCESS_COOKIE)?.value
  if (!accessToken) return { status: "failed" }

  const response = await callApi({ path: `/stores/${encodeURIComponent(slug)}/customer/orders/${number}`, method: "GET", accessToken }).catch(() => null)
  if (response?.ok) return { status: "found", order: (await response.json()) as CustomerOrder }
  // The API answers another customer's order as it answers no order: both are a 404 to the page.
  return response?.status === 404 ? { status: "missing" } : { status: "failed" }
})

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

/** One of the shopper's orders, with its timeline and where it goes — or why there is none to show. */
export function customerOrderAt(slug: string, number: number): Promise<CustomerOrderRead> {
  return readOrder(slug, number)
}

/** One of the shopper's orders against today's catalogue, as "Comprar de novo" put it in the cart; null when it could not be read. */
export function customerReorderAt(slug: string, number: number): Promise<CustomerReorder | null> {
  return readAsShopper<CustomerReorder>(`/stores/${encodeURIComponent(slug)}/customer/orders/${number}/reorder`)
}
