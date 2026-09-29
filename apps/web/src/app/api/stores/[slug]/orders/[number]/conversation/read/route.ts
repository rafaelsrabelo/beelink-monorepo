// Next
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// App
import { forwardSignedIn, refuseCrossOrigin } from "@/lib/bff"

/** The customer's messages on the order, read by the shop now; the answer is the conversation as it stands. */
export async function POST(request: NextRequest, context: RouteContext<"/api/stores/[slug]/orders/[number]/conversation/read">): Promise<NextResponse> {
  const refused = refuseCrossOrigin(request)
  if (refused) return refused

  const { slug, number } = await context.params
  const { status, payload } = await forwardSignedIn(request, { path: `/stores/${slug}/orders/${encodeURIComponent(number)}/conversation/read`, method: "POST", body: {} })
  return NextResponse.json(payload, { status })
}
