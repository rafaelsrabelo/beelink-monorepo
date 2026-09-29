// Next
import { NextResponse, type NextRequest } from "next/server"

// App
import { SECURITY_ERROR_KEY, SECURITY_NOTICE_KEY, type SecurityNotice } from "@/lib/account-security"
import { callApi, isApiErrorBody, type ApiCall } from "@/lib/api"
import { clientIpOf, refuseForeignOrigin } from "@/lib/bff"
import { clearCustomerSessionCookies, setCustomerSessionCookies } from "@/lib/customer-session-cookies"
import { callAsShopper } from "@/lib/shopper-call"
import { SHOP_SLUG } from "@/lib/shopper-forward"
import { SIGNED_OUT_EVERYWHERE_KEY, safeBackOf } from "@/lib/storefront-routes"

const ACTIONS = ["trocar-senha", "criar-senha", "sair-de-todos"] as const
type Action = (typeof ACTIONS)[number]

/** A 400 on a new password is its length: the form holds the rest. */
function refusalOf(status: number, code: string): string {
  return status === 400 ? "CUSTOMER_PASSWORD_INVALID" : code
}

/**
 * The shopper's own access to their account, from the profile tab's plain forms (BEELINK-150):
 * changing the password (`trocar-senha`), asking for the link that creates one after Google
 * (`criar-senha`) and signing out of every device (`sair-de-todos`). Under the shop's own path,
 * where the shopper's cookies live; every answer is a 303 back to `retorno`, with what it did or
 * why not — except signing out everywhere, which ends this session too and lands on the sign-in
 * (`entrada`).
 */
export async function POST(request: NextRequest, { params }: RouteContext<"/[slug]/api/customer/seguranca/[action]">) {
  const refused = refuseForeignOrigin(request)
  if (refused) return refused

  const { slug, action } = await params
  if (!SHOP_SLUG.test(slug) || !ACTIONS.includes(action as Action)) {
    return NextResponse.json({ statusCode: 404, errorCode: "NOT_FOUND", message: "No such page" }, { status: 404 })
  }

  const form = await request.formData().catch(() => null)
  const field = (name: string) => {
    const value = form?.get(name)
    return typeof value === "string" ? value : ""
  }
  const back = (key: string, value: string) => {
    const page = new URL(safeBackOf(slug, field("retorno")), request.url)
    page.searchParams.set(key, value)
    return page
  }

  if (action === "trocar-senha" && field("password") !== field("confirmacao")) {
    return NextResponse.redirect(back(SECURITY_ERROR_KEY, "CUSTOMER_PASSWORD_MISMATCH"), 303)
  }

  const call = callOf(action as Action, slug, field)
  const answered = await callAsShopper(request, slug, (accessToken) => callApi({ ...call, accessToken, clientIp: clientIpOf(request) }).catch(() => null))
  if (answered.status === "signedOut") return signedOut(new URL(`/${slug}`, request.url), slug)
  const { response, renewed } = answered

  if (response?.ok && action === "sair-de-todos") {
    // This session ended with the rest: on to the shop's sign-in (`entrada`), told why.
    const signIn = new URL(safeBackOf(slug, field("entrada")), request.url)
    signIn.searchParams.set(SIGNED_OUT_EVERYWHERE_KEY, "1")
    return signedOut(signIn, slug)
  }

  let landing: URL
  if (response?.ok) {
    const notice: SecurityNotice = action === "trocar-senha" ? "senha-trocada" : "link-senha"
    landing = back(SECURITY_NOTICE_KEY, notice)
  } else {
    const body: unknown = response ? await response.json().catch(() => null) : null
    const code = isApiErrorBody(body) ? String(body.errorCode) : response?.status === 429 ? "RATE_LIMITED" : "UNKNOWN"
    landing = back(SECURITY_ERROR_KEY, response ? refusalOf(response.status, code) : "UNKNOWN")
  }

  const answer = NextResponse.redirect(landing, 303)
  if (renewed) setCustomerSessionCookies(answer.cookies, slug, renewed)
  return answer
}

/** The API call each action makes. */
function callOf(action: Action, slug: string, field: (name: string) => string): Omit<ApiCall, "accessToken" | "clientIp"> {
  const me = `/stores/${encodeURIComponent(slug)}/customer/me`
  if (action === "trocar-senha") return { path: `${me}/password`, method: "PUT", body: { currentPassword: field("atual"), newPassword: field("password") } }
  // The link brings the shopper back to this page's own place, as the form carried it.
  if (action === "criar-senha") return { path: `${me}/password/link`, method: "POST", body: { returnTo: safeBackOf(slug, field("retorno")).split("#")[0] } }
  return { path: `${me}/sessions`, method: "DELETE" }
}

/** Out of the shop's session, its cookies gone, onto `landing`. */
function signedOut(landing: URL, slug: string): NextResponse {
  const answer = NextResponse.redirect(landing, 303)
  clearCustomerSessionCookies(answer.cookies, slug)
  return answer
}
