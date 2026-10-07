// Next
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// App
import { forwardSignedIn, refuseCrossOrigin } from "@/lib/bff"

/** What waits in each area of the shop's panel (BEELINK-309): every count the menu shows, in one answer. */
export async function GET(request: NextRequest, context: RouteContext<"/api/stores/[slug]/panel-counts">): Promise<NextResponse> {
  const refused = refuseCrossOrigin(request)
  if (refused) return refused

  const { slug } = await context.params
  const { status, payload } = await forwardSignedIn(request, { path: `/stores/${slug}/panel-counts`, method: "GET" })
  return NextResponse.json(payload, { status })
}
