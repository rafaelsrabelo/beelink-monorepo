// Next
import { NextResponse, type NextRequest } from "next/server"

// Types
import type { GoogleAuthorization } from "@harness-monorepo/contracts"

// App
import { callApi, isApiErrorBody } from "@/lib/api"
import { clientIpOf, publicOriginOf } from "@/lib/bff"
import { GOOGLE_HANDOFF_KEY, GOOGLE_HANDOFF_VALUE, setGoogleStateCookie } from "@/lib/customer-session-cookies"
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
  // The segment arrives decoded, so `%2Fevil.example` is a "slug" whose home is another site.
  if (!/^[a-z0-9-]+$/.test(slug)) return NextResponse.redirect(new URL("/", publicOriginOf(request)), 303)

  const query = request.nextUrl.searchParams
  // The platform's addresses: this flow ends at one fixed callback on the platform's host. A shop's
  // own domain sends its shopper here to begin one, with these spelled under `/<slug>` (BEELINK-284).
  const back = safeBackOf({ slug }, query.get(BACK_KEY) ?? undefined)
  const signIn = safeBackOf({ slug }, query.get("retorno") ?? undefined)
  // From a flow begun at the shop's own domain: the hash of a secret that browser keeps there. It
  // names no host — where such a flow ends is the shop's active domain, which the API reads.
  const challenge = query.get(GOOGLE_HANDOFF_KEY) ?? ""

  const response = await callApi({
    path: `/stores/${encodeURIComponent(slug)}/customer/google/authorize`,
    body: { returnTo: back, ...(GOOGLE_HANDOFF_VALUE.test(challenge) ? { handoffChallenge: challenge } : {}) },
    clientIp: clientIpOf(request),
  }).catch(() => null)

  if (!response?.ok) {
    const body: unknown = await response?.json().catch(() => null)
    const page = new URL(signIn, publicOriginOf(request))
    page.searchParams.set(BACK_KEY, back)
    page.searchParams.set("erro", isApiErrorBody(body) ? String(body.errorCode) : response?.status === 429 ? "RATE_LIMITED" : "UNKNOWN")
    return NextResponse.redirect(page, 303)
  }

  const { url, state } = (await response.json()) as GoogleAuthorization
  const answer = NextResponse.redirect(url, 303)
  setGoogleStateCookie(answer.cookies, { state, slug, signIn, back })
  return answer
}
