// Next
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// Types
import type { AffiliateSignUpResult, ApiErrorBody } from "@harness-monorepo/contracts"

// App
import { callApi } from "@/lib/api"
import { clientIpOf, readJsonBody, refuseCrossOrigin } from "@/lib/bff"
import { setSessionCookies } from "@/lib/session-cookies"

/**
 * Makes the invited e-mail's bee-link account and accepts the invite, in one go (IMPULSEIA-104) —
 * then signs in, as `/api/session` does: the tokens stop here, the browser gets cookies it cannot
 * read, and the page the shop and the `/name` accepted. Under `session` because it writes the
 * session's cookies, which the proxy leaves to this group (apps/web/AGENTS.md, rule 3).
 */
export async function POST(request: NextRequest, context: RouteContext<"/api/session/affiliate-invite/[token]">): Promise<NextResponse> {
  const refused = refuseCrossOrigin(request)
  if (refused) return refused

  const { token } = await context.params
  const response = await callApi({
    path: `/affiliate-invites/${encodeURIComponent(token)}/sign-up`,
    body: (await readJsonBody(request)) ?? {},
    clientIp: clientIpOf(request),
  })

  if (!response.ok) {
    const error = (await response.json().catch(() => ({ statusCode: response.status, errorCode: "UNKNOWN", message: "Unexpected answer" }))) as ApiErrorBody
    return NextResponse.json(error, { status: response.status })
  }

  const { session, affiliate } = (await response.json()) as AffiliateSignUpResult
  const answer = NextResponse.json(affiliate, { status: 201 })
  setSessionCookies(answer.cookies, session)
  return answer
}
