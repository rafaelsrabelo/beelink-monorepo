// Next
import { NextResponse, type NextRequest } from "next/server"

// Types
import type { CustomerReorder } from "@harness-monorepo/contracts"

// App
import { callApi } from "@/lib/api"
import { clientIpOf, refuseForeignOrigin } from "@/lib/bff"
import { addLine, CART_COOKIE, cartCookieOf, decodeCart } from "@/lib/cart-cookie"
import { clearCustomerSessionCookies, setCustomerSessionCookies } from "@/lib/customer-session-cookies"
import { callAsShopper } from "@/lib/shopper-call"
import { shopAt } from "@/lib/storefront-data"
import { storefrontRoutes } from "@/lib/storefront-routes"

/**
 * "Comprar de novo", as a form's POST: the order read against today's catalogue by the API, its
 * lines added to the cart's cookie by the cart's own rules, and the shopper sent to the cart, which
 * says where they came from and what stayed out. No script needed, and nothing kept in the browser.
 */
export async function POST(request: NextRequest, { params }: RouteContext<"/[slug]/api/orders/[number]/reorder">) {
  // A form speaks no JSON, so the origin alone is checked, as the sign-in's forms are.
  const refused = refuseForeignOrigin(request)
  if (refused) return refused

  const { slug, number } = await params
  const store = /^[a-z0-9-]+$/.test(slug) ? await shopAt(slug) : null
  if (!store || !/^\d{1,10}$/.test(number)) return NextResponse.json({ statusCode: 404, errorCode: "NOT_FOUND", message: "No such order" }, { status: 404 })

  const routes = storefrontRoutes(store)
  const go = (path: string) => NextResponse.redirect(new URL(path, request.url), 303)

  const read = await callAsShopper(request, slug, (accessToken) =>
    callApi({ path: `/stores/${encodeURIComponent(slug)}/customer/orders/${number}/reorder`, method: "GET", accessToken, clientIp: clientIpOf(request) }).catch(() => null),
  )
  if (read.status === "signedOut") {
    const answer = go(routes.signIn({ back: routes.accountOrder(Number(number)) }))
    clearCustomerSessionCookies(answer.cookies, slug)
    return answer
  }

  const reorder = read.response?.ok ? ((await read.response.json().catch(() => null)) as CustomerReorder | null) : null
  const answer = go(routes.cart({ reordered: Number(number), failed: !reorder }))
  if (read.renewed) setCustomerSessionCookies(answer.cookies, slug, read.renewed)
  if (!reorder) return answer

  const lines = reorder.lines.reduce((cart, line) => addLine(cart, { productId: line.productId, variantId: line.variantId, qty: line.quantity }), decodeCart(request.cookies.get(CART_COOKIE)?.value))
  answer.headers.append("set-cookie", cartCookieOf(slug, lines, request.nextUrl.protocol === "https:"))
  return answer
}
