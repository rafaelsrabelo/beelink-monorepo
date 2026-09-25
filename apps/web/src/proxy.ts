// Next
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// App
import { CUSTOMER_ACCESS_COOKIE, CUSTOMER_REFRESH_COOKIE, clearCustomerSessionCookies, setCustomerSessionCookies } from "@/lib/customer-session-cookies"
import { refreshCustomerSession } from "@/lib/refresh-customer-session"
import { refreshSession } from "@/lib/refresh-session"
import { ACCESS_COOKIE, REFRESH_COOKIE, clearSessionCookies, setSessionCookies } from "@/lib/session-cookies"

/** Screens a signed-in person has no business seeing. */
const AUTH_PATHS = ["/login", "/signup", "/verify-email", "/forgot-password", "/reset-password"]

function isAuthPath(pathname: string): boolean {
  return AUTH_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`))
}

/** The panel's own paths; everything else the matcher hands over is a shop window. */
const PANEL_PATHS = ["/dashboard", "/admin", "/create-store"]

function isPanelPath(pathname: string): boolean {
  return isAuthPath(pathname) || PANEL_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`))
}

/**
 * A shopper's session, kept alive on a shop's pages. The matcher only hands a shop path over when a
 * shopper's refresh cookie is there and the access cookie is not, so an anonymous visitor and a
 * crawler never reach this. It never redirects: the shop is public, signed in or not, and a
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
    clearCustomerSessionCookies(answer.cookies)
    return answer
  }

  // Upstream too, so the page rendering this request already knows who is signed in.
  request.cookies.set(CUSTOMER_ACCESS_COOKIE, outcome.session.accessToken)
  request.cookies.set(CUSTOMER_REFRESH_COOKIE, outcome.session.refreshToken)
  const answer = NextResponse.next({ request: { headers: request.headers } })
  setCustomerSessionCookies(answer.cookies, outcome.session)
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
  if (!isPanelPath(pathname)) return keepShopperSignedIn(request)

  const onAuthPath = isAuthPath(pathname)
  const hasAccess = request.cookies.has(ACCESS_COOKIE)
  const refreshToken = request.cookies.get(REFRESH_COOKIE)?.value

  if (!hasAccess && refreshToken) {
    const outcome = await refreshSession(refreshToken, request.headers.get("x-forwarded-for"))

    // The API being unreachable says nothing about the session: keep the cookies and let the page
    // deal with it, rather than signing everyone out during an outage.
    if (outcome.status === "unavailable") return NextResponse.next()

    if (outcome.status === "rejected") {
      const answer = onAuthPath
        ? NextResponse.next()
        : NextResponse.redirect(new URL("/login", request.url))
      clearSessionCookies(answer.cookies)
      return answer
    }

    const { session } = outcome

    // The cookies go to the browser, and the header goes upstream so the page rendering THIS
    // request already sees the new token instead of rendering as signed out.
    request.cookies.set(ACCESS_COOKIE, session.accessToken)
    request.cookies.set(REFRESH_COOKIE, session.refreshToken)

    const answer = onAuthPath
      ? NextResponse.redirect(new URL("/admin", request.url))
      : NextResponse.next({ request: { headers: request.headers } })
    setSessionCookies(answer.cookies, session)

    return answer
  }

  if (!hasAccess && !onAuthPath) {
    return NextResponse.redirect(new URL("/login", request.url))
  }

  if (hasAccess && onAuthPath) {
    return NextResponse.redirect(new URL("/admin", request.url))
  }

  return NextResponse.next()
}

export const config = {
  // An allow-list, and it has to stay one. Every path absent from this list is public on purpose:
  // `/<slug>` is a storefront, anonymous and meant to be indexed, and the rule above — no session
  // cookie, go to /login — would answer a crawler with a 302 for the whole public site. The
  // template this repo grew from matches the inverse, excluding a handful of paths and guarding
  // everything else; copying that matcher back in is the one edit that breaks bee-link silently.
  // The route handlers under /api are absent for a second reason: they write their own cookies.
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
    // A shop window, but only for a signed-in shopper whose short-lived token has run out: the
    // conditions below keep every anonymous request — and every crawler — out of the proxy.
    {
      source: "/:slug((?!_next|api)[^/.]+)/:path*",
      has: [{ type: "cookie", key: "bl_customer_refresh" }],
      missing: [{ type: "cookie", key: "bl_customer_access" }],
    },
  ],
}
