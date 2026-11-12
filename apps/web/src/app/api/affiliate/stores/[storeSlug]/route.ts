// Next
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// App
import { forwardSignedIn, refuseCrossOrigin } from "@/lib/bff"

/** The affiliate's front page at one shop (IMPULSEIA-108). */
export async function GET(request: NextRequest, context: RouteContext<"/api/affiliate/stores/[storeSlug]">): Promise<NextResponse> {
  const refused = refuseCrossOrigin(request)
  if (refused) return refused

  const { storeSlug } = await context.params
  const { status, payload } = await forwardSignedIn(request, { path: `/affiliate/stores/${encodeURIComponent(storeSlug)}`, method: "GET" })
  return NextResponse.json(payload, { status })
}
