// Next
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// App
import { forwardSignedIn, refuseCrossOrigin } from "@/lib/bff"

/** A customer's cashback and a page of their statement (BEELINK-242). The query string goes whole: the API refuses what it does not declare. */
export async function GET(request: NextRequest, context: RouteContext<"/api/stores/[slug]/customers/[customerId]/cashback">): Promise<NextResponse> {
  const refused = refuseCrossOrigin(request)
  if (refused) return refused

  const { slug, customerId } = await context.params
  const { status, payload } = await forwardSignedIn(request, { path: `/stores/${slug}/customers/${encodeURIComponent(customerId)}/cashback${request.nextUrl.search}`, method: "GET" })
  return NextResponse.json(payload, { status })
}
