// Next
import { NextResponse, type NextRequest } from "next/server"

// Types
import type { ApiErrorBody } from "@harness-monorepo/contracts"

// App
import { callApi } from "@/lib/api"
import { clientIpOf, readJsonBody, refuseCrossOrigin } from "@/lib/bff"
import { clearCustomerSessionCookies, CUSTOMER_ACCESS_COOKIE, CUSTOMER_REFRESH_COOKIE, setCustomerSessionCookies } from "@/lib/customer-session-cookies"
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
 * One address for the page, three doors at the API, and who is asking picks the door. A visitor's
 * cart is priced at the public door. A signed-in shopper's is priced as theirs (BEELINK-245): a
 * first-purchase promotion applies to them or says why it does not, so their price is not anyone's.
 * A code goes to the door that answers about codes, with their session, because whether a code
 * exists is told only to an identified customer — and that door counts its calls apart, so a cart
 * that only changes quantities never spends them.
 *
 * A session that is gone refuses a code. It never refuses a price: the cookies are cleared and the
 * cart is priced as a visitor's, since a cart is priced for anyone — the page learns of the session
 * where it reads one, at the order.
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
  const shop = `/stores/${encodeURIComponent(slug)}`
  // Named field by field: the doors without a code refuse a body that carries anything else.
  const withoutCode = { items: cart.items, fulfillment: cart.fulfillment }

  // The saved address a delivery would go to (BEELINK-178) is a shopper's: their doors alone take it.
  const asShopper = { ...withoutCode, ...(typeof cart.addressId === "string" ? { addressId: cart.addressId } : {}) }

  const asVisitor = async () => {
    const priced = await callApi({ path: `${shop}/cart/quote`, body: withoutCode, clientIp }).catch(() => null)
    return priced ? answerOf(priced) : refusal(502, "UNKNOWN", "The shop could not be reached")
  }
  // Either cookie is a session: the refresh one alone is a shopper whose access ran out, renewed below.
  if (couponCode === null && !request.cookies.has(CUSTOMER_ACCESS_COOKIE) && !request.cookies.has(CUSTOMER_REFRESH_COOKIE)) return asVisitor()

  const priced = await callAsShopper(request, slug, (accessToken) =>
    callApi({
      path: couponCode === null ? `${shop}/customer/cart/quote` : `${shop}/customer/orders/quote`,
      body: couponCode === null ? asShopper : { ...asShopper, couponCode },
      accessToken,
      clientIp,
    }).catch(() => null),
  )

  if (priced.status === "signedOut") {
    const answer = couponCode === null ? await asVisitor() : refusal(401, "AUTH_UNAUTHENTICATED", "Sign in to apply a coupon")
    clearCustomerSessionCookies(answer.cookies, slug)
    return answer
  }
  if (!priced.response) return refusal(502, "UNKNOWN", "The shop could not be reached")

  const answer = await answerOf(priced.response)
  if (priced.renewed) setCustomerSessionCookies(answer.cookies, slug, priced.renewed)
  return answer
}
