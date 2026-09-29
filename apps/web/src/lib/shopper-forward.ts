// Next
import { NextResponse, type NextRequest } from "next/server"

// Types
import type { ApiErrorBody } from "@harness-monorepo/contracts"

// App
import { callApi, type ApiCall } from "./api"
import { clientIpOf } from "./bff"
import { clearCustomerSessionCookies, setCustomerSessionCookies } from "./customer-session-cookies"
import { callAsShopper } from "./shopper-call"

/** A shop's slug as the API spells one; anything else names no shop, and nothing is asked. */
export const SHOP_SLUG = /^[a-z0-9-]+$/

/** An order number as the API takes one. */
export const ORDER_NUMBER = /^\d{1,10}$/

export function shopperRefusal(statusCode: number, errorCode: string, message: string): NextResponse {
  return NextResponse.json({ statusCode, errorCode, message } satisfies ApiErrorBody, { status: statusCode })
}

/**
 * A call to the API as the shop's signed-in shopper, answered as the API answered: the body and the
 * status as they came, the session renewed on the way when it had to be, and the shopper's cookies
 * cleared when no session is left. The caller forwards the visitor's address, for the API's
 * per-address limits.
 *
 * The body is read before this, once: `callAsShopper` may run the call twice, and a request's body
 * can be read only once.
 */
export async function forwardAsShopper(request: NextRequest, slug: string, call: Omit<ApiCall, "accessToken" | "clientIp">): Promise<NextResponse> {
  const clientIp = clientIpOf(request)
  const answered = await callAsShopper(request, slug, (accessToken) => callApi({ ...call, accessToken, clientIp }).catch(() => null))

  if (answered.status === "signedOut") {
    const answer = shopperRefusal(401, "AUTH_UNAUTHENTICATED", "Sign in to continue")
    clearCustomerSessionCookies(answer.cookies, slug)
    return answer
  }
  if (!answered.response) return shopperRefusal(502, "UNKNOWN", "The shop could not be reached")

  const payload: unknown = await answered.response.json().catch(() => null)
  const answer = NextResponse.json(payload ?? { statusCode: answered.response.status, errorCode: "UNKNOWN", message: "Unexpected answer" }, {
    status: answered.response.status,
  })
  if (answered.renewed) setCustomerSessionCookies(answer.cookies, slug, answered.renewed)
  return answer
}
