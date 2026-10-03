// Types
import type { BuyOrderLabelPayload, OrderLabelOverview, OrderLabelPrint } from "@harness-monorepo/contracts"

// App
import { OrderRequestError } from "./order-requests"

/** Declared on every call: `refuseCrossOrigin` answers 415 to a request that does not say it speaks JSON. */
const JSON_HEADERS: Record<string, string> = { "content-type": "application/json" }

const labelPath = (slug: string, number: number) => `/api/stores/${encodeURIComponent(slug)}/orders/${number}/label`

/** One call; a refusal carries the API's code and its details — the wallet and the price of a short one. */
async function ask<T>(path: string, method: "GET" | "POST" | "DELETE", body?: object): Promise<T> {
  const response = await fetch(path, { method, headers: JSON_HEADERS, ...(body ? { body: JSON.stringify(body) } : {}) })
  const payload: unknown = await response.json().catch(() => null)
  if (!response.ok || payload === null) {
    const answer = typeof payload === "object" && payload !== null ? (payload as Record<string, unknown>) : {}
    throw new OrderRequestError(typeof answer.errorCode === "string" ? answer.errorCode : "UNKNOWN", answer.details)
  }
  return payload as T
}

export function fetchOrderLabel(slug: string, number: number): Promise<OrderLabelOverview> {
  return ask(labelPath(slug, number), "GET")
}

export function buyOrderLabel(slug: string, number: number, payload: BuyOrderLabelPayload): Promise<OrderLabelOverview> {
  return ask(labelPath(slug, number), "POST", payload)
}

export function printOrderLabel(slug: string, number: number): Promise<OrderLabelPrint> {
  return ask(`${labelPath(slug, number)}/print`, "POST", {})
}

export function cancelOrderLabel(slug: string, number: number): Promise<OrderLabelOverview> {
  return ask(labelPath(slug, number), "DELETE")
}
