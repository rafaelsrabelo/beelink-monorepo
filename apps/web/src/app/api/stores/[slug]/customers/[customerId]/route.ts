// Next
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// App
import { forwardSignedIn, refuseCrossOrigin } from "@/lib/bff"

/** One of the shop's customers, for a new order opened with that customer already chosen. */
export async function GET(request: NextRequest, context: RouteContext<"/api/stores/[slug]/customers/[customerId]">): Promise<NextResponse> {
  const refused = refuseCrossOrigin(request)
  if (refused) return refused

  const { slug, customerId } = await context.params
  const { status, payload } = await forwardSignedIn(request, {
    path: `/stores/${slug}/customers/${encodeURIComponent(customerId)}`,
    method: "GET",
  })

  return NextResponse.json(payload, { status })
}
