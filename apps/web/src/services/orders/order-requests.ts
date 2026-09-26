// Types
import type {
  CreateOrderPayload,
  Order,
  OrderListQuery,
  OrderPage,
  OrderStatus,
  OrderStockDetails,
  OrderStockShortage,
} from "@harness-monorepo/contracts"

/**
 * What a failed call carries: the API's stable code, never a sentence (apps/web/AGENTS.md, rule 9),
 * and the details a refusal names — how many are left of each short line.
 */
export class OrderRequestError extends Error {
  constructor(
    readonly errorCode: string,
    readonly details: unknown = undefined,
  ) {
    super(errorCode)
    this.name = "OrderRequestError"
  }
}

/** The short lines of an `ORDER_STOCK_INSUFFICIENT`, or none for any other failure. */
export function shortagesOf(error: unknown): OrderStockShortage[] {
  if (!(error instanceof OrderRequestError) || error.errorCode !== "ORDER_STOCK_INSUFFICIENT") return []
  const details = error.details as Partial<OrderStockDetails> | undefined
  return Array.isArray(details?.shortages) ? details.shortages : []
}

/** Declared on every call: `refuseCrossOrigin` answers 415 to a request that does not say it speaks JSON. */
const JSON_HEADERS: Record<string, string> = { "content-type": "application/json" }

function errorCodeOf(payload: unknown): string {
  return typeof payload === "object" && payload !== null && "errorCode" in payload
    ? String((payload as { errorCode: unknown }).errorCode)
    : "UNKNOWN"
}

/** A page of the shop's orders, through this app's own route handler; the API's address is server-only. */
export async function fetchOrders(slug: string, query: OrderListQuery = {}): Promise<OrderPage> {
  const search = new URLSearchParams()
  if (query.status) search.set("status", query.status)
  if (query.q) search.set("q", query.q)
  if (query.customerId) search.set("customerId", query.customerId)
  if (query.page && query.page > 1) search.set("page", String(query.page))
  if (query.pageSize) search.set("pageSize", String(query.pageSize))

  const response = await fetch(`/api/stores/${encodeURIComponent(slug)}/orders${search.size ? `?${search.toString()}` : ""}`, {
    method: "GET",
    headers: JSON_HEADERS,
  })
  const payload: unknown = await response.json().catch(() => null)
  if (!response.ok) throw new OrderRequestError(errorCodeOf(payload))
  return payload as OrderPage
}

/** Registers an order the shop closed elsewhere. The API prices it; what comes back is what it wrote. */
export async function createOrder(slug: string, payload: CreateOrderPayload): Promise<Order> {
  const response = await fetch(`/api/stores/${encodeURIComponent(slug)}/orders`, {
    method: "POST",
    headers: JSON_HEADERS,
    body: JSON.stringify(payload),
  })
  const body: unknown = await response.json().catch(() => null)
  if (!response.ok) throw new OrderRequestError(errorCodeOf(body), (body as { details?: unknown } | null)?.details)
  return body as Order
}

/** One order, by its number in the shop. */
export async function fetchOrder(slug: string, number: number): Promise<Order> {
  const response = await fetch(`/api/stores/${encodeURIComponent(slug)}/orders/${number}`, { method: "GET", headers: JSON_HEADERS })
  const payload: unknown = await response.json().catch(() => null)
  if (!response.ok) throw new OrderRequestError(errorCodeOf(payload))
  return payload as Order
}

/** Moves the order; what comes back is the whole order, with the status it now has. */
export async function updateOrderStatus(slug: string, number: number, status: OrderStatus): Promise<Order> {
  const response = await fetch(`/api/stores/${encodeURIComponent(slug)}/orders/${number}/status`, {
    method: "PATCH",
    headers: JSON_HEADERS,
    body: JSON.stringify({ status }),
  })
  const payload: unknown = await response.json().catch(() => null)
  if (!response.ok) throw new OrderRequestError(errorCodeOf(payload))
  return payload as Order
}
