// Next
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// App
import { forwardSignedIn, readJsonBody, refuseCrossOrigin } from "@/lib/bff"

/**
 * Gives back money of the order's payment, whole or in part (BEELINK-208). The API asks the shop's
 * Asaas account, once; what it refuses comes back as it said it, with the details a screen words.
 */
export async function POST(request: NextRequest, context: RouteContext<"/api/stores/[slug]/orders/[number]/refunds">): Promise<NextResponse> {
  const refused = refuseCrossOrigin(request)
  if (refused) return refused

  const { slug, number } = await context.params
  const { status, payload } = await forwardSignedIn(request, {
    path: `/stores/${slug}/orders/${encodeURIComponent(number)}/refunds`,
    method: "POST",
    body: (await readJsonBody(request)) ?? {},
  })

  return NextResponse.json(payload, { status })
}
