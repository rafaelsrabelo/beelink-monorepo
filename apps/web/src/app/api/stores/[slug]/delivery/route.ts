// Next
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// App
import { forwardSignedIn, readJsonBody, refuseCrossOrigin } from "@/lib/bff"

/** How the shop gets an order out (BEELINK-175): pickup, its own delivery by distance bands, carriers. */
export async function GET(request: NextRequest, context: RouteContext<"/api/stores/[slug]/delivery">): Promise<NextResponse> {
  const refused = refuseCrossOrigin(request)
  if (refused) return refused

  const { slug } = await context.params
  const { status, payload } = await forwardSignedIn(request, { path: `/stores/${encodeURIComponent(slug)}/delivery`, method: "GET" })
  return NextResponse.json(payload, { status })
}

/**
 * Saved whole; the body goes as it came, and the API refuses a rule out of range. Nothing the shop
 * window serves reads these rules until the checkout quotes a delivery (BEELINK-178), so no cache is dropped.
 */
export async function PUT(request: NextRequest, context: RouteContext<"/api/stores/[slug]/delivery">): Promise<NextResponse> {
  const refused = refuseCrossOrigin(request)
  if (refused) return refused

  const { slug } = await context.params
  const { status, payload } = await forwardSignedIn(request, { path: `/stores/${encodeURIComponent(slug)}/delivery`, method: "PUT", body: (await readJsonBody(request)) ?? {} })
  return NextResponse.json(payload, { status })
}
