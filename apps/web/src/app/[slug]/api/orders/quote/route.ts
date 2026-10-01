// Next
import { NextResponse, type NextRequest } from "next/server"

// Types
import type { ApiErrorBody } from "@harness-monorepo/contracts"

// App
import { callApi } from "@/lib/api"
import { clientIpOf, readJsonBody, refuseCrossOrigin } from "@/lib/bff"
import { clearCustomerSessionCookies, setCustomerSessionCookies } from "@/lib/customer-session-cookies"
import { callAsShopper } from "@/lib/shopper-call"

function refusal(statusCode: number, errorCode: string, message: string) {
  return NextResponse.json({ statusCode, errorCode, message } satisfies ApiErrorBody, { status: statusCode })
}

async function answerOf(response: Response): Promise<NextResponse> {
  const payload: unknown = await response.json().catch(() => null)
  return NextResponse.json(payload ?? { statusCode: response.status, errorCode: "UNKNOWN", message: "Unexpected answer" }, { status: response.status })
}

/**
 * What the cart costs, before it is an order (BEELINK-194): the lines, what the shop's promotions
 * take off them and — when a code was typed — whether the coupon is taken.
 *
 * One address for the page, two doors at the API. Without a code the cart is priced at the public
 * door, signed in or not: the answer is the same for anyone. A code goes to the shopper's own door,
 * with their session, because whether a code exists is told only to an identified customer — and
 * that door counts its calls apart, so a cart that only changes quantities never spends them.
 *
 * Under the shop's path for the shopper's cookies, which reach no handler anywhere else.
 */
export async function POST(request: NextRequest, { params }: RouteContext<"/[slug]/api/orders/quote">) {
  const refused = refuseCrossOrigin(request)
  if (refused) return refused

  const { slug } = await params
  // The segment arrives decoded: a slug with a slash would reach another of the API's routes.
  if (!/^[a-z0-9-]+$/.test(slug)) return refusal(404, "NOT_FOUND", "No such shop")

  const body = await readJsonBody(request)
  const cart = typeof body === "object" && body !== null ? (body as Record<string, unknown>) : {}
  const clientIp = clientIpOf(request)
  const couponCode = typeof cart.couponCode === "string" && cart.couponCode.trim() ? cart.couponCode : null

  if (couponCode === null) {
    // Named field by field: the public door refuses a body that carries anything else.
    const priced = await callApi({ path: `/stores/${encodeURIComponent(slug)}/cart/quote`, body: { items: cart.items, fulfillment: cart.fulfillment }, clientIp }).catch(() => null)
    return priced ? answerOf(priced) : refusal(502, "UNKNOWN", "The shop could not be reached")
  }

  const priced = await callAsShopper(request, slug, (accessToken) =>
    callApi({
      path: `/stores/${encodeURIComponent(slug)}/customer/orders/quote`,
      body: { items: cart.items, fulfillment: cart.fulfillment, couponCode },
      accessToken,
      clientIp,
    }).catch(() => null),
  )

  if (priced.status === "signedOut") {
    const answer = refusal(401, "AUTH_UNAUTHENTICATED", "Sign in to apply a coupon")
    clearCustomerSessionCookies(answer.cookies, slug)
    return answer
  }
  if (!priced.response) return refusal(502, "UNKNOWN", "The shop could not be reached")

  const answer = await answerOf(priced.response)
  if (priced.renewed) setCustomerSessionCookies(answer.cookies, slug, priced.renewed)
  return answer
}
