// Next
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// App
import { forwardSignedIn, refuseCrossOrigin } from "@/lib/bff"

/**
 * Somebody at the shop opened a paid order (BEELINK-207): the bell stops telling of its payment.
 * Nothing is sent but who asks; the API's 204 is answered as an empty 200, since a JSON answer
 * cannot carry no content.
 */
export async function POST(request: NextRequest, context: RouteContext<"/api/stores/[slug]/orders/[number]/payment/seen">): Promise<NextResponse> {
  const refused = refuseCrossOrigin(request)
  if (refused) return refused

  const { slug, number } = await context.params
  const { status, payload } = await forwardSignedIn(request, { path: `/stores/${slug}/orders/${encodeURIComponent(number)}/payment/seen`, method: "POST", body: {} })
  return NextResponse.json(status === 204 ? {} : payload, { status: status === 204 ? 200 : status })
}
