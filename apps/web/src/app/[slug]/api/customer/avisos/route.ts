// Next
import { NextResponse, type NextRequest } from "next/server"

// Types
import type { UpdateCustomerNotificationsPayload } from "@harness-monorepo/contracts"

// App
import { NOTICES_ERROR_KEY, NOTICES_SAVED } from "@/lib/account-notices"
import { callApi, isApiErrorBody } from "@/lib/api"
import { clientIpOf, refuseForeignOrigin } from "@/lib/bff"
import { clearCustomerSessionCookies, setCustomerSessionCookies } from "@/lib/customer-session-cookies"
import { callAsShopper } from "@/lib/shopper-call"
import { SHOP_SLUG } from "@/lib/shopper-forward"
import { BACK_KEY, safeBackOf } from "@/lib/storefront-routes"

/**
 * The shopper's notices by e-mail, from the profile tab's plain form (BEELINK-151): a box ticked is
 * a yes, one left unticked — which a form does not send — a no. Under the shop's own path, where
 * the shopper's cookies live; the answer is a 303 back to the notices, with what it did or why not.
 */
export async function POST(request: NextRequest, { params }: RouteContext<"/[slug]/api/customer/avisos">) {
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
  // A body that is not a form carries no box at all: read as three noes, it would turn every notice off.
  if (!form) {
    const refusal = new URL(back, request.url)
    refusal.searchParams.set(NOTICES_ERROR_KEY, "UNKNOWN")
    return NextResponse.redirect(refusal, 303)
  }
  const body = { orders: form.has("orders"), favorites: form.has("favorites"), offers: form.has("offers") } satisfies UpdateCustomerNotificationsPayload

  const answered = await callAsShopper(request, slug, (accessToken) =>
    callApi({ path: `/stores/${encodeURIComponent(slug)}/customer/me/notifications`, method: "PUT", body, accessToken, clientIp: clientIpOf(request) }).catch(() => null),
  )
  if (answered.status === "signedOut") {
    // The session ended elsewhere meanwhile: nothing was saved, which the sign-in says, and it brings
    // the shopper back to the notices themselves to save them again.
    const signIn = new URL(safeBackOf(slug, field("entrada")), request.url)
    signIn.searchParams.set(BACK_KEY, back)
    signIn.searchParams.set("erro", "CUSTOMER_SESSION_ENDED")
    const signedOut = NextResponse.redirect(signIn, 303)
    clearCustomerSessionCookies(signedOut.cookies, slug)
    return signedOut
  }
  const { response, renewed } = answered

  const landing = new URL(back, request.url)
  if (response?.ok) landing.searchParams.set("aviso", NOTICES_SAVED)
  else {
    const payload: unknown = response ? await response.json().catch(() => null) : null
    landing.searchParams.set(NOTICES_ERROR_KEY, isApiErrorBody(payload) ? String(payload.errorCode) : response?.status === 429 ? "RATE_LIMITED" : "UNKNOWN")
  }

  const answer = NextResponse.redirect(landing, 303)
  if (renewed) setCustomerSessionCookies(answer.cookies, slug, renewed)
  return answer
}
