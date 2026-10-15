// Next
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// App
import { forwardSignedIn, refuseCrossOrigin } from "@/lib/bff"

/**
 * Whether the page's charge was paid, asked now (BEELINK-221): the API reads Asaas — at most once in
 * ten seconds for a page — and answers the subscription as it then stands. It is what the Assinar
 * screen asks while it waits for a payment, since no webhook reaches a desk. The API limits it per
 * address, and `forwardSignedIn` hands it the shopkeeper's address, not this server's.
 */
export async function POST(request: NextRequest, context: RouteContext<"/api/stores/[slug]/subscription/check">): Promise<NextResponse> {
  const refused = refuseCrossOrigin(request)
  if (refused) return refused

  const { slug } = await context.params
  const { status, payload } = await forwardSignedIn(request, { path: `/stores/${encodeURIComponent(slug)}/subscription/check`, method: "POST", body: {} })
  return NextResponse.json(payload, { status })
}
