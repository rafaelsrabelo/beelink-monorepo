// Next
import { NextResponse, type NextRequest } from "next/server"

// Types
import type { GoogleAuthorization } from "@harness-monorepo/contracts"

// App
import { callApi, isApiErrorBody } from "@/lib/api"
import { clientIpOf } from "@/lib/bff"
import { setGoogleStateCookie } from "@/lib/customer-session-cookies"
import { BACK_KEY, safeBackOf } from "@/lib/storefront-routes"

/**
 * "Continuar com Google" at a shop — a plain link, so it works with no script. The API opens the
 * flow and keeps its secrets; this holds the state in a cookie tied to this browser and sends the
 * shopper to Google. Where to return (`voltar`) and the sign-in page (`retorno`) stay inside the
 * shop, whatever the address says.
 *
 * A GET with a side effect, on purpose: it only starts a flow, which the state cookie binds to the
 * browser that asked, and a link is what a shopper can follow without a script.
 */
export async function GET(request: NextRequest, { params }: RouteContext<"/api/storefront/[slug]/customer/google">) {
  const { slug } = await params
  const query = request.nextUrl.searchParams
  const back = safeBackOf(slug, query.get(BACK_KEY) ?? undefined)
  const signIn = safeBackOf(slug, query.get("retorno") ?? undefined)

  const response = await callApi({
    path: `/stores/${encodeURIComponent(slug)}/customer/google/authorize`,
    body: { returnTo: back },
    clientIp: clientIpOf(request),
  }).catch(() => null)

  if (!response?.ok) {
    const body: unknown = await response?.json().catch(() => null)
    const page = new URL(signIn, request.url)
    page.searchParams.set(BACK_KEY, back)
    page.searchParams.set("erro", isApiErrorBody(body) ? String(body.errorCode) : response?.status === 429 ? "RATE_LIMITED" : "UNKNOWN")
    return NextResponse.redirect(page, 303)
  }

  const { url, state } = (await response.json()) as GoogleAuthorization
  const answer = NextResponse.redirect(url, 303)
  setGoogleStateCookie(answer.cookies, { state, slug, signIn })
  return answer
}
