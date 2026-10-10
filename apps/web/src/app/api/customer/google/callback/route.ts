// Next
import { NextResponse, type NextRequest } from "next/server"

// Types
import type { GoogleSignIn } from "@harness-monorepo/contracts"

// App
import { callApi, isApiErrorBody } from "@/lib/api"
import { clientIpOf, publicOriginOf } from "@/lib/bff"
import { clearGoogleStateCookie, googleFlightOf, GOOGLE_STATE_COOKIE, setCustomerSessionCookies } from "@/lib/customer-session-cookies"
import { shopOriginOf } from "@/lib/shop-origin"
import { BACK_KEY, safeBackOf } from "@/lib/storefront-routes"

/**
 * Where Google sends every shop's shopper back — one fixed address, registered once in Google's
 * console. The browser's cookie says which shop the flow began at; the state Google returns must be
 * the one that cookie holds, or the sign-in was not started in this browser and is refused.
 *
 * Signed in, it stores the same session cookies the password door does and goes back to where the
 * shopper was, inside that shop. The cart is a cookie of its own and is never touched here.
 *
 * A flow begun at the shop's own domain (BEELINK-284) stores nothing here: a cookie of this host is
 * none of that domain's. The API answers with a handoff instead of a session, and the browser is
 * sent to that domain's handler with its code. The domain is the one the API read from the shop —
 * nothing in this request, its cookie included, says where a sign-in is sent. A refusal goes to the
 * shop's sign-in page here as ever, which `src/proxy.ts` leads to the domain.
 */
export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams
  const flight = googleFlightOf(request.cookies.get(GOOGLE_STATE_COOKIE)?.value)

  // Back to the face the shopper left, with what to say and where they were going; with no flight
  // in hand, the shop is unknown.
  const fail = (code: string) => {
    const page = new URL(flight ? safeBackOf({ slug: flight.slug }, flight.signIn) : "/", publicOriginOf(request))
    if (flight) {
      page.searchParams.set(BACK_KEY, safeBackOf({ slug: flight.slug }, flight.back))
      page.searchParams.set("erro", code)
    }
    const answer = NextResponse.redirect(page, 303)
    clearGoogleStateCookie(answer.cookies)
    return answer
  }

  if (query.get("error")) return fail("GOOGLE_CANCELLED")
  const code = query.get("code")
  const state = query.get("state")
  if (!flight || !code || !state || state !== flight.state) return fail("GOOGLE_STATE_INVALID")

  const response = await callApi({ path: "/customer/google/callback", body: { code, state }, clientIp: clientIpOf(request) }).catch(() => null)
  if (!response?.ok) {
    const body: unknown = await response?.json().catch(() => null)
    return fail(isApiErrorBody(body) ? String(body.errorCode) : response?.status === 429 ? "RATE_LIMITED" : "UNKNOWN")
  }

  const signedIn = (await response.json()) as GoogleSignIn
  if (signedIn.handoff) {
    const { host, code } = signedIn.handoff
    if (!/^[a-z0-9-]+$/.test(signedIn.storeSlug) || !/^[a-z0-9]([a-z0-9.-]*[a-z0-9])?$/.test(host)) return fail("UNKNOWN")

    const door = new URL(`/${signedIn.storeSlug}/api/customer/google/session`, shopOriginOf(request, host))
    door.searchParams.set("code", code)
    const handed = NextResponse.redirect(door, 303)
    handed.headers.set("cache-control", "no-store")
    handed.headers.set("referrer-policy", "no-referrer")
    clearGoogleStateCookie(handed.cookies)
    return handed
  }
  if (!signedIn.session) return fail("UNKNOWN")

  const answer = NextResponse.redirect(new URL(safeBackOf({ slug: signedIn.storeSlug }, signedIn.returnTo ?? undefined), publicOriginOf(request)), 303)
  clearGoogleStateCookie(answer.cookies)
  // On the shop's path, as the password door stores them: the account Google opened is that shop's.
  // The platform's host, always: this address is one, fixed, and no shop's domain.
  setCustomerSessionCookies(answer, { slug: signedIn.storeSlug }, signedIn.session)
  return answer
}
