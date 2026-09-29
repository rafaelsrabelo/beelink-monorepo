// Next
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// App
import { CUSTOMER_ACCESS_COOKIE, CUSTOMER_REFRESH_COOKIE, clearCustomerSessionCookies, setCustomerSessionCookies } from "@/lib/customer-session-cookies"
import { refreshCustomerSession } from "@/lib/refresh-customer-session"
import { isPanelPage, panelReturnOf, RETURN_KEY, signInHrefOf } from "@/lib/panel-return"
import { refreshSession } from "@/lib/refresh-session"
import { ACCESS_COOKIE, REFRESH_COOKIE, clearSessionCookies, setSessionCookies } from "@/lib/session-cookies"

/** Screens a signed-in person has no business seeing. */
const AUTH_PATHS = ["/login", "/signup", "/verify-email", "/forgot-password", "/reset-password"]

function isAuthPath(pathname: string): boolean {
  return AUTH_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`))
}

/**
 * A shopper's e-mailed link — confirming the address, or setting a new password — names the shop it
 * came from (`voltar=/<slug>`). The account it acts on is that shop's, so a shopkeeper's session in
 * the same browser has no say in it: sent to the panel instead, the link would never be spent.
 */
function isShopperLink({ nextUrl }: NextRequest): boolean {
  return (
    (nextUrl.pathname === "/verify-email" || nextUrl.pathname === "/reset-password") &&
    /^\/[a-z0-9-]+$/.test(nextUrl.searchParams.get("voltar") ?? "")
  )
}

/** The panel's own paths; everything else the matcher hands over is a shop window. */
function isPanelPath(pathname: string): boolean {
  return isAuthPath(pathname) || isPanelPage(pathname)
}

/** Where a signed-out visitor of a panel page goes: the sign-in, and back to this very page after. */
function signInFrom(request: NextRequest): URL {
  return new URL(signInHrefOf(request.nextUrl.pathname + request.nextUrl.search), request.url)
}

/** Where a signed-in visitor of the sign-in screen goes: the page it was asked to go back to, or the panel. */
function panelFrom(request: NextRequest): URL {
  return new URL(panelReturnOf(request.nextUrl.searchParams.get(RETURN_KEY)) ?? "/admin", request.url)
}

/**
 * Renewed this long before the access token runs out. A handler's new cookies reach the browser only
 * with its answer: renewing on a call that answers late — an upload — while another call still
 * carries the spent refresh past the API's 20 s grace would end the session as a stolen token.
 * Renewing ahead, on the ordinary calls of an open panel, makes a renewal on a late one rare.
 */
const RENEW_AHEAD_S = 180

/** Seconds left on an access token, read from its payload without checking it: only to time a renewal. */
function secondsLeftOf(token: string): number | null {
  try {
    const payload = token.split(".")[1] ?? ""
    const { exp } = JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/"))) as { exp?: unknown }
    return typeof exp === "number" ? exp - Date.now() / 1000 : null
  } catch {
    return null
  }
}

/**
 * The panel's route handlers, with a session whose access token is running out or ran out a quarter
 * of an hour into an open tab (BEELINK-169). It never redirects — a handler answers JSON. A refused
 * refresh clears the cookies, so the handler answers 401 and the page sends the person to sign in;
 * an API that did not answer is an outage, never a sign-out.
 */
async function keepPanelSignedIn(request: NextRequest): Promise<NextResponse> {
  const refreshToken = request.cookies.get(REFRESH_COOKIE)?.value
  const accessToken = request.cookies.get(ACCESS_COOKIE)?.value
  if (!refreshToken) return NextResponse.next()
  if (accessToken) {
    const left = secondsLeftOf(accessToken)
    // An upload answers late: it renews only a token already gone, never ahead.
    if (left === null || left > RENEW_AHEAD_S || request.nextUrl.pathname.startsWith("/api/uploads")) return NextResponse.next()
  }

  const outcome = await refreshSession(refreshToken, request.headers.get("x-forwarded-for"))
  if (outcome.status === "unavailable") {
    if (accessToken) return NextResponse.next()
    return NextResponse.json({ statusCode: 503, errorCode: "SERVICE_UNAVAILABLE", message: "The session could not be renewed" }, { status: 503 })
  }

  if (outcome.status === "rejected") {
    const answer = NextResponse.next()
    clearSessionCookies(answer.cookies)
    return answer
  }

  // Upstream too, so the handler of this very request calls the API with the new token.
  request.cookies.set(ACCESS_COOKIE, outcome.session.accessToken)
  request.cookies.set(REFRESH_COOKIE, outcome.session.refreshToken)
  const answer = NextResponse.next({ request: { headers: request.headers } })
  setSessionCookies(answer.cookies, outcome.session)
  return answer
}

/**
 * A shopper's session, kept alive on a shop's pages. The matcher only hands a shop path over when a
 * shopper's refresh cookie is there and the access cookie is not — this shop's, since both live on
 * its path — so an anonymous visitor and a crawler never reach this. It never redirects: the shop is public, signed in or not, and a
 * refusal only means the shopper browses signed out from here.
 */
async function keepShopperSignedIn(request: NextRequest): Promise<NextResponse> {
  const slug = request.nextUrl.pathname.split("/")[1] ?? ""
  const refreshToken = request.cookies.get(CUSTOMER_REFRESH_COOKIE)?.value

  if (!refreshToken || request.cookies.has(CUSTOMER_ACCESS_COOKIE) || !/^[a-z0-9-]+$/.test(slug)) return NextResponse.next()

  const outcome = await refreshCustomerSession(slug, refreshToken, request.headers.get("x-forwarded-for"))

  if (outcome.status === "unavailable") return NextResponse.next()

  if (outcome.status === "rejected") {
    const answer = NextResponse.next()
    clearCustomerSessionCookies(answer.cookies, slug)
    return answer
  }

  // Upstream too, so the page rendering this request already knows who is signed in.
  request.cookies.set(CUSTOMER_ACCESS_COOKIE, outcome.session.accessToken)
  request.cookies.set(CUSTOMER_REFRESH_COOKIE, outcome.session.refreshToken)
  const answer = NextResponse.next({ request: { headers: request.headers } })
  setCustomerSessionCookies(answer.cookies, slug, outcome.session)
  return answer
}

/**
 * An optimistic check, never the lock: it only looks at whether a cookie is there, so a signed-out
 * visitor lands on /login before a page renders. The API validates the bearer token on every call.
 *
 * It is also the only place that may refresh: it can store the new pair, which a Server Component
 * cannot.
 */
export async function proxy(request: NextRequest): Promise<NextResponse> {
  const { pathname } = request.nextUrl
  if (pathname.startsWith("/api/")) return keepPanelSignedIn(request)
  if (!isPanelPath(pathname)) return keepShopperSignedIn(request)
  if (isShopperLink(request)) return NextResponse.next()

  const onAuthPath = isAuthPath(pathname)
  const hasAccess = request.cookies.has(ACCESS_COOKIE)
  const refreshToken = request.cookies.get(REFRESH_COOKIE)?.value

  if (!hasAccess && refreshToken) {
    const outcome = await refreshSession(refreshToken, request.headers.get("x-forwarded-for"))

    // The API being unreachable says nothing about the session: keep the cookies and let the page
    // deal with it, rather than signing everyone out during an outage.
    if (outcome.status === "unavailable") return NextResponse.next()

    if (outcome.status === "rejected") {
      const answer = onAuthPath ? NextResponse.next() : NextResponse.redirect(signInFrom(request))
      clearSessionCookies(answer.cookies)
      return answer
    }

    const { session } = outcome

    // The cookies go to the browser, and the header goes upstream so the page rendering THIS
    // request already sees the new token instead of rendering as signed out.
    request.cookies.set(ACCESS_COOKIE, session.accessToken)
    request.cookies.set(REFRESH_COOKIE, session.refreshToken)

    const answer = onAuthPath ? NextResponse.redirect(panelFrom(request)) : NextResponse.next({ request: { headers: request.headers } })
    setSessionCookies(answer.cookies, session)

    return answer
  }

  if (!hasAccess && !onAuthPath) return NextResponse.redirect(signInFrom(request))
  if (hasAccess && onAuthPath) return NextResponse.redirect(panelFrom(request))

  return NextResponse.next()
}

export const config = {
  // An allow-list, and it has to stay one. Every path absent from this list is public on purpose:
  // `/<slug>` is a storefront, anonymous and meant to be indexed, and the rule above — no session
  // cookie, go to /login — would answer a crawler with a 302 for the whole public site. The
  // template this repo grew from matches the inverse, excluding a handful of paths and guarding
  // everything else; copying that matcher back in is the one edit that breaks bee-link silently.
  // The route handlers under /api come in only with a panel session, to renew it when its access
  // token runs out, and never those that write their own cookies (session, auth) or a shop's
  // (customer, storefront).
  matcher: [
    "/dashboard",
    "/dashboard/:path*",
    "/admin",
    "/admin/:path*",
    // Signed in like the two above. It is on the API's reserved-slug list, so no shop can ever
    // take it and turn a guarded path into a storefront.
    "/create-store",
    "/login",
    "/signup",
    "/verify-email",
    "/forgot-password",
    "/reset-password",
    {
      source: "/api/:group((?!(?:session|auth|customer|storefront)(?:/|$))[^/]+)/:path*",
      has: [{ type: "cookie", key: "bl_refresh" }],
    },
    // A shop window, but only for a signed-in shopper whose short-lived token has run out: the
    // conditions below keep every anonymous request — and every crawler — out of the proxy.
    {
      source: "/:slug((?!_next|api)[^/.]+)/:path*",
      has: [{ type: "cookie", key: "bl_shopper_refresh" }],
      missing: [{ type: "cookie", key: "bl_shopper_access" }],
    },
  ],
}
