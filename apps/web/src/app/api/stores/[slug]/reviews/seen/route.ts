// Next
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// App
import { forwardSignedIn, refuseCrossOrigin } from "@/lib/bff"

/** The owner opened the list: what is in it now is seen. */
export async function POST(request: NextRequest, context: RouteContext<"/api/stores/[slug]/reviews/seen">): Promise<NextResponse> {
  const refused = refuseCrossOrigin(request)
  if (refused) return refused

  const { slug } = await context.params
  const { status, payload } = await forwardSignedIn(request, { path: `/stores/${slug}/reviews/seen`, method: "POST" })
  if (status === 204) return new NextResponse(null, { status: 204 })
  return NextResponse.json(payload, { status })
}
