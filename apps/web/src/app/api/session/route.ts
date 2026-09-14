// Next
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// Types
import type { ApiErrorBody, AuthSession } from "@harness-monorepo/contracts"

// App
import { callApi } from "@/lib/api"
import { clientIpOf, readJsonBody, refuseCrossOrigin } from "@/lib/bff"
import { REFRESH_COOKIE, clearSessionCookies, setSessionCookies } from "@/lib/session-cookies"

/** Signs in. The tokens stop here: the browser gets cookies it cannot read, and the user. */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const refused = refuseCrossOrigin(request)
  if (refused) return refused

  const response = await callApi({
    path: "/auth/login",
    body: (await readJsonBody(request)) ?? {},
    clientIp: clientIpOf(request),
  })

  if (!response.ok) {
    const error = (await response.json()) as ApiErrorBody
    return NextResponse.json(error, { status: response.status })
  }

  const session = (await response.json()) as AuthSession
  const answer = NextResponse.json(session.user, { status: 200 })
  setSessionCookies(answer.cookies, session)

  return answer
}

/** Signs out. The cookies go whatever the API says, so a stale session cannot strand anyone. */
export async function DELETE(request: NextRequest): Promise<NextResponse> {
  const origin = request.headers.get("origin")
  if (origin !== null && origin !== request.nextUrl.origin) {
    return NextResponse.json(
      { statusCode: 403, errorCode: "FORBIDDEN", message: "Cross-origin request refused" },
      { status: 403 },
    )
  }

  const refreshToken = request.cookies.get(REFRESH_COOKIE)?.value

  if (refreshToken) {
    await callApi({ path: "/auth/logout", body: { refreshToken }, clientIp: clientIpOf(request) }).catch(
      () => undefined,
    )
  }

  const answer = new NextResponse(null, { status: 204 })
  clearSessionCookies(answer.cookies)

  return answer
}
