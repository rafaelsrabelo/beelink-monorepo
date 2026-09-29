// Next
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// App
import { RETURN_KEY, signInHrefOf } from "@/lib/panel-return"
import { clearSessionCookies } from "@/lib/session-cookies"

/**
 * Where server code sends someone whose cookies outlived their session — after a sign-out
 * elsewhere, or a password reset that revoked every device.
 *
 * It exists because a Server Component cannot clear a cookie. Without it the two halves disagree
 * forever: the proxy sees a session cookie and allows /dashboard, the page finds no session and
 * redirects to /login, and the proxy sends it straight back.
 */
export function GET(request: NextRequest): NextResponse {
  // `voltar` survives the trip: the page the session ended on is where signing in comes back to.
  const back = request.nextUrl.searchParams.get(RETURN_KEY)
  const answer = NextResponse.redirect(new URL(back ? signInHrefOf(back) : "/login", request.url))
  clearSessionCookies(answer.cookies)

  return answer
}
