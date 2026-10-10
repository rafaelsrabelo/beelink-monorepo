// Node
import { randomBytes } from "node:crypto"

// Next
import { NextResponse, type NextRequest } from "next/server"

// Types
import type { GoogleHandoffSession } from "@harness-monorepo/contracts"

// App
import { callApi, isApiErrorBody } from "@/lib/api"
import { clientIpOf, publicOriginOf } from "@/lib/bff"
import { GOOGLE_HANDOFF_VALUE, GOOGLE_STATE_COOKIE, clearGoogleHandoffCookie, googleHandoffFlightOf, setCustomerSessionCookies } from "@/lib/customer-session-cookies"
import { shopAddressOf, shopHomeOf } from "@/lib/shop-address"
import { BACK_KEY, safeBackOf } from "@/lib/storefront-routes"

/**
 * Where a Google sign-in begun at a shop's own domain ends (BEELINK-284). The platform's callback
 * sends the browser here with a code; this trades it at the API, server to server, with the secret
 * this browser has kept since the flow began (`../route.ts`), and stores the session's cookies as
 * the password door stores them — at this domain, on `/`.
 *
 * The code is in the address for this one request: every answer is a redirect to an address
 * without it, never cached and with no referrer. A code that arrives where no flow began — another
 * person's browser, a link someone sent — is spent all the same, and signs nobody in.
 *
 * A GET that stores a session, which only the browser holding the secret can make it do.
 */
export async function GET(request: NextRequest, { params }: RouteContext<"/[slug]/api/customer/google/session">) {
  const { slug } = await params
  // The segment arrives decoded: with `%2Fevil.example`, every `/${slug}` below would be another site.
  if (!/^[a-z0-9-]+$/.test(slug)) return NextResponse.json({ statusCode: 404, errorCode: "NOT_FOUND", message: "No such shop" }, { status: 404 })

  const here = shopAddressOf(request.headers, slug)
  const flight = googleHandoffFlightOf(request.cookies.get(GOOGLE_STATE_COOKIE)?.value)
  const code = request.nextUrl.searchParams.get("code") ?? ""

  const leave = (path: string, query: Record<string, string> = {}) => {
    const page = new URL(path, publicOriginOf(request))
    for (const [key, value] of Object.entries(query)) page.searchParams.set(key, value)
    const answer = NextResponse.redirect(page, 303)
    answer.headers.set("cache-control", "no-store")
    answer.headers.set("referrer-policy", "no-referrer")
    clearGoogleHandoffCookie(answer.cookies, slug)
    return answer
  }
  // Back to the face the shopper left, with what to say; with no flight in hand, the shop's front door.
  const fail = (erro: string) => (flight ? leave(safeBackOf(here, flight.signIn), { [BACK_KEY]: safeBackOf(here, flight.back), erro }) : leave(shopHomeOf(here)))

  if (!GOOGLE_HANDOFF_VALUE.test(code)) return fail("GOOGLE_STATE_INVALID")

  // With no secret held, one that matches nothing: the API takes the code out and refuses.
  const verifier = flight?.verifier ?? randomBytes(32).toString("base64url")
  const response = await callApi({ path: `/stores/${slug}/customer/google/handoff`, body: { code, verifier }, clientIp: clientIpOf(request) }).catch(() => null)
  if (!flight || !response?.ok) {
    const body: unknown = await response?.json().catch(() => null)
    return fail(isApiErrorBody(body) ? String(body.errorCode) : response?.status === 429 ? "RATE_LIMITED" : "UNKNOWN")
  }

  const { session, returnTo } = (await response.json()) as GoogleHandoffSession
  const answer = leave(safeBackOf(here, returnTo ?? flight.back))
  // Last: at the shop's own domain it expires the pair's twins on `/<slug>` with raw headers, which
  // a later write to the jar would drop.
  setCustomerSessionCookies(answer, here, session)
  return answer
}
