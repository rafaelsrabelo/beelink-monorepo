// Next
import { NextResponse, type NextRequest } from "next/server"

// App
import { callApi, isApiErrorBody } from "@/lib/api"
import { clientIpOf, publicOriginOf, refuseForeignOrigin } from "@/lib/bff"
import { clearCustomerSessionCookies, setCustomerSessionCookies } from "@/lib/customer-session-cookies"
import { FAVORITE_REMOVED, FAVORITES_ERROR_KEY } from "@/lib/favorite-list-query"
import { callAsShopper } from "@/lib/shopper-call"
import { PRODUCT_ID, SHOP_SLUG } from "@/lib/shopper-forward"
import { BACK_KEY, safeBackOf } from "@/lib/storefront-routes"

/**
 * The heart on a card of Favoritos (6g), from a plain form, so the tab removes without a script.
 * Under the shop's own path, where the shopper's cookies live; the answer is a 303 back to the tab,
 * with what it did or why not.
 */
export async function POST(request: NextRequest, { params }: RouteContext<"/[slug]/api/customer/favoritos">) {
  const refused = refuseForeignOrigin(request)
  if (refused) return refused

  const { slug } = await params
  if (!SHOP_SLUG.test(slug)) return NextResponse.json({ statusCode: 404, errorCode: "NOT_FOUND", message: "No such shop" }, { status: 404 })

  const form = await request.formData().catch(() => null)
  const field = (name: string) => {
    const value = form?.get(name)
    return typeof value === "string" ? value : ""
  }
  const back = safeBackOf(slug, field("retorno"))
  const landing = new URL(back, publicOriginOf(request))
  const productId = field("produto")
  if (!PRODUCT_ID.test(productId)) {
    landing.searchParams.set(FAVORITES_ERROR_KEY, "UNKNOWN")
    return NextResponse.redirect(landing, 303)
  }

  const answered = await callAsShopper(request, slug, (accessToken) =>
    callApi({ path: `/stores/${encodeURIComponent(slug)}/customer/favorites/${productId}`, method: "DELETE", accessToken, clientIp: clientIpOf(request) }).catch(() => null),
  )
  if (answered.status === "signedOut") {
    // The session ended elsewhere meanwhile: nothing was removed, which the sign-in says, and it brings
    // the shopper back to the tab.
    const signIn = new URL(safeBackOf(slug, field("entrada")), publicOriginOf(request))
    signIn.searchParams.set(BACK_KEY, back)
    signIn.searchParams.set("erro", "CUSTOMER_SESSION_ENDED")
    const signedOut = NextResponse.redirect(signIn, 303)
    clearCustomerSessionCookies(signedOut.cookies, slug)
    return signedOut
  }
  const { response, renewed } = answered

  if (response?.ok) landing.searchParams.set("aviso", FAVORITE_REMOVED)
  else {
    const payload: unknown = response ? await response.json().catch(() => null) : null
    landing.searchParams.set(FAVORITES_ERROR_KEY, isApiErrorBody(payload) ? String(payload.errorCode) : response?.status === 429 ? "RATE_LIMITED" : "UNKNOWN")
  }

  const answer = NextResponse.redirect(landing, 303)
  if (renewed) setCustomerSessionCookies(answer.cookies, slug, renewed)
  return answer
}
