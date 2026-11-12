// Next
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// App
import { callApi } from "@/lib/api"
import { clientIpOf, refuseCrossOrigin } from "@/lib/bff"

/** Whether a `/name` can be the affiliate's in the invite's shop, as it would be kept (IMPULSEIA-104). */
export async function GET(request: NextRequest, context: RouteContext<"/api/affiliate-invites/[token]/slug">): Promise<NextResponse> {
  const refused = refuseCrossOrigin(request)
  if (refused) return refused

  const { token } = await context.params
  const slug = request.nextUrl.searchParams.get("slug") ?? ""
  const response = await callApi({ path: `/affiliate-invites/${encodeURIComponent(token)}/slug?slug=${encodeURIComponent(slug)}`, method: "GET", clientIp: clientIpOf(request) })
  return NextResponse.json(await response.json().catch(() => ({ statusCode: response.status, errorCode: "UNKNOWN", message: "Unexpected answer" })), { status: response.status })
}
