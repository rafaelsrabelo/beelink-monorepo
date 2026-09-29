// Next
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// App
import { forwardSignedIn, refuseCrossOrigin } from "@/lib/bff"

/** What the panel's bell counts: the customers' messages the shop has not read, and in how many conversations. */
export async function GET(request: NextRequest, context: RouteContext<"/api/stores/[slug]/conversations/unread">): Promise<NextResponse> {
  const refused = refuseCrossOrigin(request)
  if (refused) return refused

  const { slug } = await context.params
  const { status, payload } = await forwardSignedIn(request, { path: `/stores/${slug}/conversations/unread`, method: "GET" })
  return NextResponse.json(payload, { status })
}
