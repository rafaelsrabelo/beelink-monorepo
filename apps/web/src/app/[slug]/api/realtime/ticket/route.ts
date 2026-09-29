// Next
import { NextResponse, type NextRequest } from "next/server"

// Types
import type { ApiErrorBody } from "@harness-monorepo/contracts"

// App
import { callApi } from "@/lib/api"
import { clientIpOf, refuseCrossOrigin } from "@/lib/bff"
import { clearCustomerSessionCookies, setCustomerSessionCookies } from "@/lib/customer-session-cookies"
import { callAsShopper } from "@/lib/shopper-call"

function refusal(statusCode: number, errorCode: string, message: string) {
  return NextResponse.json({ statusCode, errorCode, message } satisfies ApiErrorBody, { status: statusCode })
}

/**
 * A ticket to the shopper's own real-time room at the shop, for the shop window's socket. Asked with
 * the session in the shop's cookies, renewed once on the way as every shopper call is; the page gets
 * only the ticket, short and single use.
 */
export async function POST(request: NextRequest, { params }: RouteContext<"/[slug]/api/realtime/ticket">) {
  const refused = refuseCrossOrigin(request)
  if (refused) return refused

  const { slug } = await params
  if (!/^[a-z0-9-]+$/.test(slug)) return refusal(404, "NOT_FOUND", "No such shop")

  const issued = await callAsShopper(request, slug, (accessToken) =>
    callApi({ path: `/stores/${encodeURIComponent(slug)}/customer/realtime/ticket`, body: {}, accessToken, clientIp: clientIpOf(request) }).catch(() => null),
  )
  if (issued.status === "signedOut") {
    const answer = refusal(401, "AUTH_UNAUTHENTICATED", "Sign in to follow the shop live")
    clearCustomerSessionCookies(answer.cookies, slug)
    return answer
  }
  if (!issued.response) return refusal(502, "UNKNOWN", "The shop could not be reached")

  const payload: unknown = await issued.response.json().catch(() => null)
  const answer = NextResponse.json(payload ?? { statusCode: issued.response.status, errorCode: "UNKNOWN", message: "Unexpected answer" }, { status: issued.response.status })
  if (issued.renewed) setCustomerSessionCookies(answer.cookies, slug, issued.renewed)
  return answer
}
