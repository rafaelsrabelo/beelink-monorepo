// Next
import { NextResponse, type NextRequest } from "next/server"

// Types
import type { GoogleSignIn } from "@harness-monorepo/contracts"

// App
import { callApi, isApiErrorBody } from "@/lib/api"
import { clientIpOf } from "@/lib/bff"
import { clearGoogleStateCookie, googleFlightOf, GOOGLE_STATE_COOKIE, setCustomerSessionCookies } from "@/lib/customer-session-cookies"
import { BACK_KEY, safeBackOf } from "@/lib/storefront-routes"

/**
 * Where Google sends every shop's shopper back — one fixed address, registered once in Google's
 * console. The browser's cookie says which shop the flow began at; the state Google returns must be
 * the one that cookie holds, or the sign-in was not started in this browser and is refused.
 *
 * Signed in, it stores the same session cookies the password door does and goes back to where the
 * shopper was, inside that shop. The cart is a cookie of its own and is never touched here.
 */
export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams
  const flight = googleFlightOf(request.cookies.get(GOOGLE_STATE_COOKIE)?.value)

  // Back to the face the shopper left, with what to say and where they were going; with no flight
  // in hand, the shop is unknown.
  const fail = (code: string) => {
    const page = new URL(flight ? safeBackOf(flight.slug, flight.signIn) : "/", request.url)
    if (flight) {
      page.searchParams.set(BACK_KEY, safeBackOf(flight.slug, flight.back))
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
  const answer = NextResponse.redirect(new URL(safeBackOf(signedIn.storeSlug, signedIn.returnTo ?? undefined), request.url), 303)
  // On the shop's path, as the password door stores them: the account Google opened is that shop's.
  setCustomerSessionCookies(answer.cookies, signedIn.storeSlug, signedIn.session)
  clearGoogleStateCookie(answer.cookies)
  return answer
}
