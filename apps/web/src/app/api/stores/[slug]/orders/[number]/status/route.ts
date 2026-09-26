// Next
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// App
import { forwardSignedIn, readJsonBody, refuseCrossOrigin } from "@/lib/bff"

/** Moves the order to another status. The API refuses any move out of a cancelled order. */
export async function PATCH(request: NextRequest, context: RouteContext<"/api/stores/[slug]/orders/[number]/status">): Promise<NextResponse> {
  const refused = refuseCrossOrigin(request)
  if (refused) return refused

  const { slug, number } = await context.params
  const { status, payload } = await forwardSignedIn(request, {
    path: `/stores/${slug}/orders/${encodeURIComponent(number)}/status`,
    method: "PATCH",
    body: (await readJsonBody(request)) ?? {},
  })

  return NextResponse.json(payload, { status })
}
