// Next
import { NextResponse, type NextRequest } from "next/server"

// Types
import type { ApiErrorBody } from "@harness-monorepo/contracts"

// App
import { callApi } from "@/lib/api"
import { clientIpOf, refuseCrossOrigin } from "@/lib/bff"
import { clearCustomerSessionCookies, setCustomerSessionCookies } from "@/lib/customer-session-cookies"
import { shopAddressOf } from "@/lib/shop-address"
import { callAsShopper } from "@/lib/shopper-call"

function refusal(statusCode: number, errorCode: string, message: string) {
  return NextResponse.json({ statusCode, errorCode, message } satisfies ApiErrorBody, { status: statusCode })
}

/**
 * The shopper's own cancel of an order the shop has not accepted, as the cart's order: under the
 * shop's path, JSON only, with the session renewed once on the way. The API's answer — the order,
 * now cancelled, or its refusal — goes back as it came.
 */
export async function POST(request: NextRequest, { params }: RouteContext<"/[slug]/api/orders/[number]/cancel">) {
  const refused = refuseCrossOrigin(request)
  if (refused) return refused

  const { slug, number } = await params
  if (!/^[a-z0-9-]+$/.test(slug)) return refusal(404, "NOT_FOUND", "No such shop")
  // A number that is not one names no order; the API answers the same, but the round trip buys nothing.
  if (!/^\d{1,10}$/.test(number)) return refusal(404, "ORDER_NOT_FOUND", "No such order")

  const clientIp = clientIpOf(request)
  const cancelled = await callAsShopper(request, slug, (accessToken) =>
    callApi({ path: `/stores/${encodeURIComponent(slug)}/customer/orders/${number}/cancel`, body: {}, accessToken, clientIp }).catch(() => null),
  )

  if (cancelled.status === "signedOut") {
    const answer = refusal(401, "AUTH_UNAUTHENTICATED", "Sign in to cancel the order")
    clearCustomerSessionCookies(answer, shopAddressOf(request.headers, slug))
    return answer
  }
  if (!cancelled.response) return refusal(502, "UNKNOWN", "The shop could not be reached")

  const payload: unknown = await cancelled.response.json().catch(() => null)
  const answer = NextResponse.json(payload ?? { statusCode: cancelled.response.status, errorCode: "UNKNOWN", message: "Unexpected answer" }, {
    status: cancelled.response.status,
  })
  if (cancelled.renewed) setCustomerSessionCookies(answer, shopAddressOf(request.headers, slug), cancelled.renewed)
  return answer
}
