// Next
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// App
import { forwardSignedIn, refuseCrossOrigin } from "@/lib/bff"

/**
 * A shop's funnel in a period (BEELINK-276), as its owner reads it. The query string is forwarded
 * whole, as the other report's is: the API says what is no period. Nothing is cached — these are
 * the owner's numbers, read with their session.
 */
export async function GET(request: NextRequest, context: RouteContext<"/api/stores/[slug]/reports/funnel">): Promise<NextResponse> {
  const refused = refuseCrossOrigin(request)
  if (refused) return refused

  const { slug } = await context.params
  const { status, payload } = await forwardSignedIn(request, {
    path: `/stores/${slug}/reports/funnel${request.nextUrl.search}`,
    method: "GET",
  })

  return NextResponse.json(payload, { status })
}
