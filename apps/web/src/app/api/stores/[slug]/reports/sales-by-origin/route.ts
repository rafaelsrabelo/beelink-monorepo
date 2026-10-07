// Next
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// App
import { forwardSignedIn, refuseCrossOrigin } from "@/lib/bff"

/**
 * A shop's sales in a period, by where their buyers came from (BEELINK-275), as its owner reads
 * them. The query string is forwarded whole: the API refuses what it does not declare and says what
 * is no period, and a second list of allowed keys here would drift. Nothing is cached — these are
 * the owner's numbers, read with their session.
 */
export async function GET(request: NextRequest, context: RouteContext<"/api/stores/[slug]/reports/sales-by-origin">): Promise<NextResponse> {
  const refused = refuseCrossOrigin(request)
  if (refused) return refused

  const { slug } = await context.params
  const { status, payload } = await forwardSignedIn(request, {
    path: `/stores/${slug}/reports/sales-by-origin${request.nextUrl.search}`,
    method: "GET",
  })

  return NextResponse.json(payload, { status })
}
