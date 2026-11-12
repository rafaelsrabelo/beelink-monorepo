// Next
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// App
import { callApi } from "@/lib/api"
import { clientIpOf, refuseCrossOrigin } from "@/lib/bff"

/**
 * The invite as the person invited reads it (IMPULSEIA-104). Public: whoever holds the link reads it,
 * and the API's per-address limit sees the visitor, not this server.
 */
export async function GET(request: NextRequest, context: RouteContext<"/api/affiliate-invites/[token]">): Promise<NextResponse> {
  const refused = refuseCrossOrigin(request)
  if (refused) return refused

  const { token } = await context.params
  const response = await callApi({ path: `/affiliate-invites/${encodeURIComponent(token)}`, method: "GET", clientIp: clientIpOf(request) })
  return NextResponse.json(await response.json().catch(() => ({ statusCode: response.status, errorCode: "UNKNOWN", message: "Unexpected answer" })), { status: response.status })
}
