// Next
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// App
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
  const answer = NextResponse.redirect(new URL("/login", request.url))
  clearSessionCookies(answer.cookies)

  return answer
}
