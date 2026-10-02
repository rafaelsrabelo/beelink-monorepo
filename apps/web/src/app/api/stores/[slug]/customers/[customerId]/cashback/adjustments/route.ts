// Next
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// App
import { forwardSignedIn, readJsonBody, refuseCrossOrigin } from "@/lib/bff"

/** The shopkeeper's correction of a customer's cashback, with its reason (BEELINK-242). Taking more than they have comes back as the API's 409. */
export async function POST(request: NextRequest, context: RouteContext<"/api/stores/[slug]/customers/[customerId]/cashback/adjustments">): Promise<NextResponse> {
  const refused = refuseCrossOrigin(request)
  if (refused) return refused

  const { slug, customerId } = await context.params
  const { status, payload } = await forwardSignedIn(request, {
    path: `/stores/${slug}/customers/${encodeURIComponent(customerId)}/cashback/adjustments`,
    method: "POST",
    body: (await readJsonBody(request)) ?? {},
  })
  return NextResponse.json(payload, { status })
}
