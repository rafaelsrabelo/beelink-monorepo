// Next
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// App
import { forwardSignedIn, readJsonBody, refuseCrossOrigin } from "@/lib/bff"

/** How the shop ships by carrier (BEELINK-183): its services, its days to post, its default parcel. */
export async function GET(request: NextRequest, context: RouteContext<"/api/stores/[slug]/integrations/melhor-envio/settings">): Promise<NextResponse> {
  const refused = refuseCrossOrigin(request)
  if (refused) return refused

  const { slug } = await context.params
  const { status, payload } = await forwardSignedIn(request, { path: `/stores/${encodeURIComponent(slug)}/integrations/melhor-envio/settings`, method: "GET" })
  return NextResponse.json(payload, { status })
}

/**
 * Saved whole; the body goes as it came, and the API refuses a choice out of range. Nothing the shop
 * window serves changes until the checkout quotes carriers (N4), so no cache is dropped.
 */
export async function PUT(request: NextRequest, context: RouteContext<"/api/stores/[slug]/integrations/melhor-envio/settings">): Promise<NextResponse> {
  const refused = refuseCrossOrigin(request)
  if (refused) return refused

  const { slug } = await context.params
  const { status, payload } = await forwardSignedIn(request, { path: `/stores/${encodeURIComponent(slug)}/integrations/melhor-envio/settings`, method: "PUT", body: (await readJsonBody(request)) ?? {} })
  return NextResponse.json(payload, { status })
}
