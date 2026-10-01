// Next
import { NextResponse, type NextRequest } from "next/server"

// Types
import type { DeleteCustomerAccountPayload } from "@harness-monorepo/contracts"

// App
import { PRIVACY_ERROR_KEY } from "@/lib/account-privacy"
import { callApi, isApiErrorBody } from "@/lib/api"
import { clientIpOf, publicOriginOf, refuseForeignOrigin } from "@/lib/bff"
import { clearCustomerSessionCookies, setCustomerSessionCookies } from "@/lib/customer-session-cookies"
import { callAsShopper } from "@/lib/shopper-call"
import { SHOP_SLUG } from "@/lib/shopper-forward"
import { ACCOUNT_DELETED_KEY, BACK_KEY, safeBackOf } from "@/lib/storefront-routes"

/**
 * "Excluir minha conta" (BEELINK-152), from the profile tab's plain form: the password, or the
 * e-mail of an account with none. Done, the shop's cookies go and the shopper lands on the shop's
 * sign-in (`entrada`), told so; refused, they go back to the section (`retorno`) with why.
 */
export async function POST(request: NextRequest, { params }: RouteContext<"/[slug]/api/customer/excluir-conta">) {
  const refused = refuseForeignOrigin(request)
  if (refused) return refused

  const { slug } = await params
  if (!SHOP_SLUG.test(slug)) return NextResponse.json({ statusCode: 404, errorCode: "NOT_FOUND", message: "No such page" }, { status: 404 })

  const form = await request.formData().catch(() => null)
  const field = (name: string) => {
    const value = form?.get(name)
    return typeof value === "string" ? value : ""
  }
  const pageOf = (name: string) => new URL(safeBackOf(slug, field(name)), publicOriginOf(request))

  // Only the field the form drew: an account with a password is never confirmed by its e-mail.
  const body: DeleteCustomerAccountPayload = form?.has("password") ? { password: field("password") } : { email: field("email") }
  const answered = await callAsShopper(request, slug, (accessToken) =>
    callApi({ path: `/stores/${encodeURIComponent(slug)}/customer/me`, method: "DELETE", body, accessToken, clientIp: clientIpOf(request) }).catch(() => null),
  )

  if (answered.status === "signedOut") {
    // Nothing was deleted: the session had ended before the form was sent.
    const signIn = pageOf("entrada")
    signIn.searchParams.set(BACK_KEY, safeBackOf(slug, field("retorno")))
    signIn.searchParams.set("erro", "CUSTOMER_SESSION_ENDED")
    return signedOut(signIn, slug)
  }
  const { response, renewed } = answered

  if (response?.ok) {
    const signIn = pageOf("entrada")
    signIn.searchParams.set(ACCOUNT_DELETED_KEY, "1")
    return signedOut(signIn, slug)
  }

  const answer: unknown = response ? await response.json().catch(() => null) : null
  const code = isApiErrorBody(answer) ? String(answer.errorCode) : response?.status === 429 ? "RATE_LIMITED" : "UNKNOWN"
  const back = pageOf("retorno")
  back.searchParams.set(PRIVACY_ERROR_KEY, code)
  const redirect = NextResponse.redirect(back, 303)
  if (renewed) setCustomerSessionCookies(redirect.cookies, slug, renewed)
  return redirect
}

/** Out of the shop's session, its cookies gone, onto `landing`. */
function signedOut(landing: URL, slug: string): NextResponse {
  const answer = NextResponse.redirect(landing, 303)
  clearCustomerSessionCookies(answer.cookies, slug)
  return answer
}
