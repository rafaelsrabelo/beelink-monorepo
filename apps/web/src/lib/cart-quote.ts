import "server-only"

// Next
import { headers } from "next/headers"

// Types
import type { CustomerOrderQuotePayload, OrderQuote } from "@harness-monorepo/contracts"

// App
import { callApi } from "./api"
import type { ServedQuote } from "./cart-pricing"

/**
 * The cart page's first price (BEELINK-194), asked while the page is drawn so the summary is in the
 * HTML rather than a number that flashes in after hydration (AGENTS.md, rule 7). At the public door:
 * a page is served before any coupon is typed, and without one a shopper's cart costs what anyone's
 * does.
 *
 * Never kept: it depends on the hour — a promotion starting or ending — and on a cart no two
 * visitors share. The visitor's address goes with it, since the API's limit is per address and this
 * server's would be every visitor's at once. Null when the API did not answer; the browser asks then.
 */
export async function cartQuoteAt(slug: string, cart: CustomerOrderQuotePayload): Promise<ServedQuote | null> {
  if (!cart.items.length) return null

  const clientIp = (await headers()).get("x-forwarded-for")
  const response = await callApi({
    path: `/stores/${encodeURIComponent(slug)}/cart/quote`,
    body: { items: cart.items, fulfillment: cart.fulfillment },
    clientIp,
  }).catch(() => null)
  if (!response?.ok) return null

  const answer: unknown = await response.json().catch(() => null)
  // A 2xx that is not a price is no price: the page draws from it, and the browser asks instead.
  if (typeof answer !== "object" || answer === null || !("lines" in answer) || !Array.isArray(answer.lines)) return null
  return { cart, quote: answer as OrderQuote, at: Date.now() }
}
