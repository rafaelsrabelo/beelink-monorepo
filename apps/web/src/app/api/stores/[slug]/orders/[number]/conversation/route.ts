// Next
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// App
import { forwardSignedIn, refuseCrossOrigin } from "@/lib/bff"

/** The order's conversation as the shop reads it; empty while its customer has not written. */
export async function GET(request: NextRequest, context: RouteContext<"/api/stores/[slug]/orders/[number]/conversation">): Promise<NextResponse> {
  const refused = refuseCrossOrigin(request)
  if (refused) return refused

  const { slug, number } = await context.params
  const { status, payload } = await forwardSignedIn(request, { path: `/stores/${slug}/orders/${encodeURIComponent(number)}/conversation`, method: "GET" })
  return NextResponse.json(payload, { status })
}
