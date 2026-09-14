// Next
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// App
import { refreshSession } from "@/lib/refresh-session"
import { ACCESS_COOKIE, REFRESH_COOKIE, clearSessionCookies, setSessionCookies } from "@/lib/session-cookies"

/** Screens a signed-in person has no business seeing. */
const AUTH_PATHS = ["/login", "/signup", "/verify-email", "/forgot-password", "/reset-password"]

function isAuthPath(pathname: string): boolean {
  return AUTH_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`))
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
      ? NextResponse.redirect(new URL("/dashboard", request.url))
      : NextResponse.next({ request: { headers: request.headers } })
    setSessionCookies(answer.cookies, session)

    return answer
  }

  if (!hasAccess && !onAuthPath) {
    return NextResponse.redirect(new URL("/login", request.url))
  }

  if (hasAccess && onAuthPath) {
    return NextResponse.redirect(new URL("/dashboard", request.url))
  }

  return NextResponse.next()
}

export const config = {
  // The route handlers under /api manage their own cookies and must not be redirected.
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)"],
}
