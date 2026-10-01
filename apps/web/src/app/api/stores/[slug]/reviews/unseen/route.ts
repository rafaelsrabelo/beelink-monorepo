// Next
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// App
import { forwardSignedIn, refuseCrossOrigin } from "@/lib/bff"

/** How many reviews were written since the owner last opened the list: the menu's count. */
export async function GET(request: NextRequest, context: RouteContext<"/api/stores/[slug]/reviews/unseen">): Promise<NextResponse> {
  const refused = refuseCrossOrigin(request)
  if (refused) return refused

  const { slug } = await context.params
  const { status, payload } = await forwardSignedIn(request, { path: `/stores/${slug}/reviews/unseen`, method: "GET" })
  return NextResponse.json(payload, { status })
}
