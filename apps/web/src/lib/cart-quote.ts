import "server-only"

// Next
import { cookies, headers } from "next/headers"

// Types
import type { CustomerOrderQuotePayload, OrderQuote } from "@harness-monorepo/contracts"

// App
import { callApi } from "./api"
import type { ServedQuote } from "./cart-pricing"
import { CUSTOMER_ACCESS_COOKIE } from "./customer-session-cookies"

/**
 * The cart page's first price (BEELINK-194), asked while the page is drawn so the summary is in the
 * HTML rather than a number that flashes in after hydration (AGENTS.md, rule 7). Without a code: a
 * page is served before any coupon is typed.
 *
 * Asked as whoever the page is drawn for (BEELINK-245). A visitor's cart is priced at the public
 * door; a signed-in shopper's at their own cart's door, with their session, since a first-purchase
 * promotion makes their price differ from anyone's. `shopperId` is the shopper the page read, null
 * for a visitor.
 *
 * Never kept: it depends on the hour — a promotion starting or ending — and on a cart no two
 * visitors share. The visitor's address goes with it, since the API's limit is per address and this
 * server's would be every visitor's at once. Null when the API did not answer with a price — a
 * session that ran out since the page read it, too — and the browser asks then.
 */
export async function cartQuoteAt(slug: string, cart: CustomerOrderQuotePayload, shopperId: string | null): Promise<ServedQuote | null> {
  if (!cart.items.length) return null

  const shop = `/stores/${encodeURIComponent(slug)}`
  const accessToken = shopperId ? (await cookies()).get(CUSTOMER_ACCESS_COOKIE)?.value : undefined
  // The shopper is read from this cookie in the same request, so one without it is none: a guard, not a case.
  if (shopperId && !accessToken) return null

  const clientIp = (await headers()).get("x-forwarded-for")
  const response = await callApi({
    path: shopperId ? `${shop}/customer/cart/quote` : `${shop}/cart/quote`,
    body: { items: cart.items, fulfillment: cart.fulfillment },
    accessToken,
    clientIp,
  }).catch(() => null)
  if (!response?.ok) return null

  const answer: unknown = await response.json().catch(() => null)
  // A 2xx that is not a price is no price: the page draws from it, and the browser asks instead.
  if (typeof answer !== "object" || answer === null || !("lines" in answer) || !Array.isArray(answer.lines)) return null
  return { shopperId, cart, quote: answer as OrderQuote, at: Date.now() }
}
