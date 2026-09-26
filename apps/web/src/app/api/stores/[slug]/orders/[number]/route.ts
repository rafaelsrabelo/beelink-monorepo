// Next
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// App
import { forwardSignedIn, refuseCrossOrigin } from "@/lib/bff"

/** One of the shop's orders, by its number. */
export async function GET(request: NextRequest, context: RouteContext<"/api/stores/[slug]/orders/[number]">): Promise<NextResponse> {
  const refused = refuseCrossOrigin(request)
  if (refused) return refused

  const { slug, number } = await context.params
  const { status, payload } = await forwardSignedIn(request, {
    path: `/stores/${slug}/orders/${encodeURIComponent(number)}`,
    method: "GET",
  })

  return NextResponse.json(payload, { status })
}
