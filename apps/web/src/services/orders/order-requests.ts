// Types
import type {
  OrderDeliveryPayload,
  SetOrderDeliveryFeePayload,
  CreateOrderPayload,
  Order,
  OrderListQuery,
  OrderPage,
  OrderQuote,
  OrderStatus,
  OrderStockDetails,
  OrderStockShortage,
  ShopOrderQuotePayload,
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

/**
 * What a sale would cost before it is registered (BEELINK-194): the API's own pricing, with the
 * promotions running on the day it is dated. Nothing is saved, reserved or used by asking.
 */
export async function quoteOrder(slug: string, sale: ShopOrderQuotePayload): Promise<OrderQuote> {
  const response = await fetch(`/api/stores/${encodeURIComponent(slug)}/orders/quote`, {
    method: "POST",
    headers: JSON_HEADERS,
    body: JSON.stringify(sale),
  })
  const body: unknown = await response.json().catch(() => null)
  if (!response.ok) throw new OrderRequestError(errorCodeOf(body), (body as { details?: unknown } | null)?.details)
  return body as OrderQuote
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

/** Tells how a delivery goes: the whole record, replacing what was told. */
export async function setOrderDelivery(slug: string, number: number, delivery: OrderDeliveryPayload): Promise<Order> {
  const response = await fetch(`/api/stores/${encodeURIComponent(slug)}/orders/${number}/delivery`, {
    method: "PUT",
    headers: JSON_HEADERS,
    body: JSON.stringify(delivery),
  })
  const payload: unknown = await response.json().catch(() => null)
  if (!response.ok) throw new OrderRequestError(errorCodeOf(payload))
  return payload as Order
}

/** Tells the fee agreed for a delivery (BEELINK-170); zero is a free delivery. */
export async function setOrderDeliveryFee(slug: string, number: number, deliveryFeeCents: number): Promise<Order> {
  const response = await fetch(`/api/stores/${encodeURIComponent(slug)}/orders/${number}/delivery-fee`, {
    method: "PUT",
    headers: JSON_HEADERS,
    body: JSON.stringify({ deliveryFeeCents } satisfies SetOrderDeliveryFeePayload),
  })
  const payload: unknown = await response.json().catch(() => null)
  if (!response.ok) throw new OrderRequestError(errorCodeOf(payload))
  return payload as Order
}

/** Takes back what was told of the delivery. */
export async function clearOrderDelivery(slug: string, number: number): Promise<Order> {
  const response = await fetch(`/api/stores/${encodeURIComponent(slug)}/orders/${number}/delivery`, { method: "DELETE", headers: JSON_HEADERS })
  const payload: unknown = await response.json().catch(() => null)
  if (!response.ok) throw new OrderRequestError(errorCodeOf(payload))
  return payload as Order
}
