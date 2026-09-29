// Next
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// App
import { forwardSignedIn, refuseCrossOrigin } from "@/lib/bff"

/**
 * A page of the shop's conversations: open, unread or all, by order number or customer. The query
 * string goes whole: the API refuses what it does not declare.
 */
export async function GET(request: NextRequest, context: RouteContext<"/api/stores/[slug]/conversations">): Promise<NextResponse> {
  const refused = refuseCrossOrigin(request)
  if (refused) return refused

  const { slug } = await context.params
  const { status, payload } = await forwardSignedIn(request, { path: `/stores/${slug}/conversations${request.nextUrl.search}`, method: "GET" })
  return NextResponse.json(payload, { status })
}
