// Next
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// App
import { forwardSignedIn, refuseCrossOrigin } from "@/lib/bff"

/**
 * A shop's customers, as its owner pages and searches through them. The query string is forwarded
 * whole: the API refuses what it does not declare, and a second list of allowed keys here would drift.
 */
export async function GET(request: NextRequest, context: RouteContext<"/api/stores/[slug]/customers">): Promise<NextResponse> {
  const refused = refuseCrossOrigin(request)
  if (refused) return refused

  const { slug } = await context.params
  const { status, payload } = await forwardSignedIn(request, {
    path: `/stores/${slug}/customers${request.nextUrl.search}`,
    method: "GET",
  })

  return NextResponse.json(payload, { status })
}
