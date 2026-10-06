// Types
import type {
  CreateRestockRequestPayload,
  CustomerOrder,
  CustomerOrderPaymentAnswer,
  CustomerOrderQuotePayload,
  OrderQuote,
  PlaceCustomerOrderPayload,
  PublicProductCard,
} from "@harness-monorepo/contracts"

export interface StorefrontSearchResult {
  products: PublicProductCard[]
  /** How many the shop has altogether, so the list can offer "see all N". */
  total: number
}

/**
 * What the shop's search box shows while someone types.
 *
 * It asks this app's own handler and never the API — the browser reaching the API directly is the
 * one thing the BFF rule exists to stop, and a shop window is no exception to it just because it
 * carries no token.
 */
export async function searchStorefront(slug: string, term: string, scope = ""): Promise<StorefrontSearchResult> {
  const query = new URLSearchParams({ q: term })
  if (scope) query.set("categoria", scope)
  const response = await fetch(`/api/storefront/${encodeURIComponent(slug)}/search?${query.toString()}`, {
    headers: { accept: "application/json" },
  })

  // A suggestion list that failed is an empty list. Someone mid-word does not want an error under
  // the field they are typing in, and the form underneath still works.
  if (!response.ok) return { products: [], total: 0 }

  return (await response.json()) as StorefrontSearchResult
}

/** A visitor's "Avise-me" for one sold-out combination. Anonymous; the handler forwards the address. */
export async function sendRestockRequest(
  slug: string,
  productId: string,
  payload: CreateRestockRequestPayload,
): Promise<void> {
  const response = await fetch(
    `/api/storefront/${encodeURIComponent(slug)}/products/${encodeURIComponent(productId)}/restock-requests`,
    { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) },
  )

  if (!response.ok) {
    const answer: unknown = await response.json().catch(() => null)
    throw new RestockRequestError(
      typeof answer === "object" && answer !== null && "errorCode" in answer ? String(answer.errorCode) : "UNKNOWN",
    )
  }
}

/** What a refused request carries: the API's stable code, never a sentence. */
export class RestockRequestError extends Error {
  constructor(readonly errorCode: string) {
    super(errorCode)
    this.name = "RestockRequestError"
  }
}

/**
 * The signed-in shopper's cart, placed as an order. To the shop's own handler (`/<slug>/api/orders`),
 * where the shopper's cookies reach — never the API, and never a token in page code.
 */
export async function placeShopperOrder(slug: string, payload: PlaceCustomerOrderPayload): Promise<CustomerOrder> {
  const response = await fetch(`/${encodeURIComponent(slug)}/api/orders`, {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify(payload),
  })
  const answer: unknown = await response.json().catch(() => null)

  if (!response.ok) {
    const code = typeof answer === "object" && answer !== null && "errorCode" in answer ? String(answer.errorCode) : null
    const details = typeof answer === "object" && answer !== null && "details" in answer ? answer.details : undefined
    throw new ShopperOrderError(code ?? (response.status === 429 ? "RATE_LIMITED" : "UNKNOWN"), details)
  }
  return answer as CustomerOrder
}

/**
 * What the cart costs now (BEELINK-194): the lines, what the promotions take off them and whether the
 * coupon typed is taken. Through the shop's own handler, which picks the API's door — a code is
 * checked for a signed-in shopper only. A coupon that does not hold is an answer, not a failure.
 */
export async function quoteCart(slug: string, cart: CustomerOrderQuotePayload): Promise<OrderQuote> {
  const response = await fetch(`/${encodeURIComponent(slug)}/api/orders/quote`, {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify(cart),
  })
  const answer: unknown = await response.json().catch(() => null)

  if (!response.ok) {
    const code = typeof answer === "object" && answer !== null && "errorCode" in answer ? String(answer.errorCode) : null
    throw new ShopperOrderError(code ?? (response.status === 429 ? "RATE_LIMITED" : "UNKNOWN"))
  }
  // A 2xx that is not a price — a proxy's own page — is a failure here, never a cart to draw from.
  if (typeof answer !== "object" || answer === null || !("lines" in answer) || !Array.isArray(answer.lines)) throw new ShopperOrderError("UNKNOWN")
  return answer as OrderQuote
}

/** What a refused order carries: the API's stable code, never a sentence, and the lines it named. */
export class ShopperOrderError extends Error {
  constructor(
    readonly errorCode: string,
    readonly details?: unknown,
  ) {
    super(errorCode)
    this.name = "ShopperOrderError"
  }
}

/** The shopper's own cancel of an order the shop has not accepted, through the shop's handler. */
export async function cancelShopperOrder(slug: string, number: number): Promise<CustomerOrder> {
  const response = await fetch(`/${encodeURIComponent(slug)}/api/orders/${number}/cancel`, {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json" },
    body: "{}",
  })
  const answer: unknown = await response.json().catch(() => null)

  if (!response.ok) {
    const code = typeof answer === "object" && answer !== null && "errorCode" in answer ? String(answer.errorCode) : null
    throw new ShopperOrderError(code ?? (response.status === 429 ? "RATE_LIMITED" : "UNKNOWN"))
  }
  return answer as CustomerOrder
}

async function orderPaymentCall(slug: string, number: number, method: "GET" | "POST"): Promise<CustomerOrderPaymentAnswer> {
  const response = await fetch(`/${encodeURIComponent(slug)}/api/orders/${number}/payment`, {
    method,
    headers: { "content-type": "application/json", accept: "application/json" },
    ...(method === "POST" ? { body: "{}" } : {}),
  })
  const answer: unknown = await response.json().catch(() => null)

  if (!response.ok) {
    const code = typeof answer === "object" && answer !== null && "errorCode" in answer ? String(answer.errorCode) : null
    throw new ShopperOrderError(code ?? (response.status === 429 ? "RATE_LIMITED" : "UNKNOWN"))
  }
  // A 2xx that is not a payment's answer — a proxy's own page — is a failure, never "no charge yet".
  if (typeof answer !== "object" || answer === null || !("payment" in answer)) throw new ShopperOrderError("UNKNOWN")
  return answer as CustomerOrderPaymentAnswer
}

/**
 * The charge of one of the shopper's orders (BEELINK-205), through the shop's handler: what the
 * bee-link API knows of it. The payment screen asks here, again and again, and never Asaas.
 */
export function readOrderPayment(slug: string, number: number): Promise<CustomerOrderPaymentAnswer> {
  return orderPaymentCall(slug, number, "GET")
}

/** Makes sure the order has a charge good to pay — a first one, or one in place of a Pix past its time. */
export function makeOrderPayment(slug: string, number: number): Promise<CustomerOrderPaymentAnswer> {
  return orderPaymentCall(slug, number, "POST")
}
