// Next
import { NextResponse, type NextRequest } from "next/server"

// Types
import type { ApiErrorBody, CustomerOffersPayload } from "@harness-monorepo/contracts"

// App
import { callApi } from "@/lib/api"
import { clientIpOf, readJsonBody, refuseCrossOrigin } from "@/lib/bff"
import { offersCartOf } from "@/lib/cart-offers"
import { clearCustomerSessionCookies, CUSTOMER_ACCESS_COOKIE, CUSTOMER_REFRESH_COOKIE, setCustomerSessionCookies } from "@/lib/customer-session-cookies"
import { shopAddressOf } from "@/lib/shop-address"
import { callAsShopper } from "@/lib/shopper-call"

function refusal(statusCode: number, errorCode: string, message: string) {
  return NextResponse.json({ statusCode, errorCode, message } satisfies ApiErrorBody, { status: statusCode })
}

/**
 * The signed-in shopper's offers for the cart on their screen: the shop's shown coupons that cart
 * may take, as the API lists them. The cart page asks again as the cart changes.
 *
 * A shopper's alone: the answer names codes, and whether a code exists is told only to an identified
 * customer. A visitor is refused here without the API being asked, and one whose session ended is
 * refused and has its cookies cleared — the cart draws no list then, and loses nothing else by it.
 *
 * Under the shop's path for the shopper's cookies, which reach no handler anywhere else. The body is
 * rebuilt field by field: the API's door refuses what it does not know, and a code is none of its business.
 */
export async function POST(request: NextRequest, { params }: RouteContext<"/[slug]/api/offers">) {
  const refused = refuseCrossOrigin(request)
  if (refused) return refused

  const { slug } = await params
  // The segment arrives decoded: a slug with a slash would reach another of the API's routes.
  if (!/^[a-z0-9-]+$/.test(slug)) return refusal(404, "NOT_FOUND", "No such shop")
  if (!request.cookies.has(CUSTOMER_ACCESS_COOKIE) && !request.cookies.has(CUSTOMER_REFRESH_COOKIE)) return refusal(401, "AUTH_UNAUTHENTICATED", "Sign in to see your offers")

  const body = await readJsonBody(request)
  const sent = typeof body === "object" && body !== null ? (body as Record<string, unknown>) : {}
  const cart = offersCartOf({
    ...(Array.isArray(sent.items) ? { items: sent.items as CustomerOffersPayload["items"] } : {}),
    ...(sent.fulfillment === "DELIVERY" || sent.fulfillment === "PICKUP" ? { fulfillment: sent.fulfillment } : {}),
    ...(typeof sent.addressId === "string" ? { addressId: sent.addressId } : {}),
    ...(typeof sent.shipping === "object" && sent.shipping !== null ? { shipping: sent.shipping as CustomerOffersPayload["shipping"] } : {}),
  })
  const clientIp = clientIpOf(request)

  const read = await callAsShopper(request, slug, (accessToken) => callApi({ path: `/stores/${encodeURIComponent(slug)}/customer/offers`, body: cart, accessToken, clientIp }).catch(() => null))

  if (read.status === "signedOut") {
    const answer = refusal(401, "AUTH_UNAUTHENTICATED", "Sign in to see your offers")
    clearCustomerSessionCookies(answer, shopAddressOf(request.headers, slug))
    return answer
  }
  if (!read.response) return refusal(502, "UNKNOWN", "The shop could not be reached")

  const payload: unknown = await read.response.json().catch(() => null)
  const answer = NextResponse.json(payload ?? { statusCode: read.response.status, errorCode: "UNKNOWN", message: "Unexpected answer" }, { status: read.response.status })
  if (read.renewed) setCustomerSessionCookies(answer, shopAddressOf(request.headers, slug), read.renewed)
  return answer
}
