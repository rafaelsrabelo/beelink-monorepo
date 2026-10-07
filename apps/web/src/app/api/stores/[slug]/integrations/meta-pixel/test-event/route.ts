// Next
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// App
import { forwardSignedIn, readJsonBody, refuseCrossOrigin } from "@/lib/bff"

/**
 * Sends one test event to the shop's pixel with its token (BEELINK-274) and answers what Meta said.
 * The API limits it per address — it presents a credential to Meta — and `forwardSignedIn` hands it
 * the shopkeeper's address, not this server's.
 */
export async function POST(request: NextRequest, context: RouteContext<"/api/stores/[slug]/integrations/meta-pixel/test-event">): Promise<NextResponse> {
  const refused = refuseCrossOrigin(request)
  if (refused) return refused

  const { slug } = await context.params
  const { status, payload } = await forwardSignedIn(request, { path: `/stores/${encodeURIComponent(slug)}/integrations/meta-pixel/test-event`, method: "POST", body: (await readJsonBody(request)) ?? {} })
  return NextResponse.json(payload, { status })
}
