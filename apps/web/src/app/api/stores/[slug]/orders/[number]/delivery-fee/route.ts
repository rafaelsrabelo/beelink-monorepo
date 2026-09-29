// Next
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// App
import { forwardSignedIn, readJsonBody, refuseCrossOrigin } from "@/lib/bff"

type Context = RouteContext<"/api/stores/[slug]/orders/[number]/delivery-fee">

/** Tells the fee agreed for a delivery (BEELINK-170). The API refuses a pick-up, a cancelled order and a total past the cap. */
export async function PUT(request: NextRequest, context: Context): Promise<NextResponse> {
  const refused = refuseCrossOrigin(request)
  if (refused) return refused

  const { slug, number } = await context.params
  const { status, payload } = await forwardSignedIn(request, {
    path: `/stores/${slug}/orders/${encodeURIComponent(number)}/delivery-fee`,
    method: "PUT",
    body: (await readJsonBody(request)) ?? {},
  })
  return NextResponse.json(payload, { status })
}
