import "server-only"

// Next
import { cookies, headers } from "next/headers"

// Types
import type { CustomerOffers, CustomerOffersPayload } from "@harness-monorepo/contracts"

// App
import { callApi } from "./api"
import { offersCartOf, type ServedOffers } from "./cart-offers"
import { CUSTOMER_ACCESS_COOKIE } from "./customer-session-cookies"

/**
 * The signed-in shopper's own offers at this shop — whether an order of theirs stands, the
 * first-order benefit to show them, and the shown coupons the cart given may take — or null with no
 * session, or no good answer. Asked while the page is drawn, with their access cookie, so the strip
 * and the cart's list are in the HTML rather than arriving after it.
 *
 * Never kept: it is one customer's, and it changes with their orders. The visitor's address goes
 * with it, since the API's limit is per address and this server's would be every shopper's at once.
 */
export async function customerOffersAt(slug: string, cart: CustomerOffersPayload = {}): Promise<CustomerOffers | null> {
  const accessToken = (await cookies()).get(CUSTOMER_ACCESS_COOKIE)?.value
  if (!accessToken) return null

  const clientIp = (await headers()).get("x-forwarded-for")
  const response = await callApi({ path: `/stores/${encodeURIComponent(slug)}/customer/offers`, body: offersCartOf(cart), accessToken, clientIp }).catch(() => null)
  if (!response?.ok) return null

  const answer: unknown = await response.json().catch(() => null)
  // A 2xx that is not the answer is no answer: the page draws without it.
  if (typeof answer !== "object" || answer === null || !("coupons" in answer) || !Array.isArray(answer.coupons)) return null
  return answer as CustomerOffers
}

/**
 * The cart page's first list of coupons, for the shopper it is drawn for, with the question it
 * answers and when: the browser starts from it rather than ask again. Null when it could not be read.
 */
export async function servedOffersAt(slug: string, shopperId: string, cart: CustomerOffersPayload): Promise<ServedOffers | null> {
  const asked = offersCartOf(cart)
  const offers = await customerOffersAt(slug, asked)
  return offers && { shopperId, cart: asked, offers, at: Date.now() }
}
