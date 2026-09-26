// Next
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// App
import { forwardSignedIn, readJsonBody, refuseCrossOrigin } from "@/lib/bff"

/**
 * Two records of one person made one. The API decides which is kept — the one with an account —
 * and answers it, so the panel goes on to the record it names and not to the one in the address.
 */
export async function POST(request: NextRequest, context: RouteContext<"/api/stores/[slug]/customers/[customerId]/merge">): Promise<NextResponse> {
  const refused = refuseCrossOrigin(request)
  if (refused) return refused

  const { slug, customerId } = await context.params
  const { status, payload } = await forwardSignedIn(request, {
    path: `/stores/${slug}/customers/${encodeURIComponent(customerId)}/merge`,
    method: "POST",
    body: (await readJsonBody(request)) ?? {},
  })

  return NextResponse.json(payload, { status })
}
