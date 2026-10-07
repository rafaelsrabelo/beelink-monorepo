// Next
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// App
import { forwardSignedIn, readJsonBody, refuseCrossOrigin } from "@/lib/bff"

const pathOf = (slug: string) => `/stores/${encodeURIComponent(slug)}/integrations/meta-pixel/token`

/**
 * Save the pixel's Conversions API token, or replace the one saved (BEELINK-274). The body goes as
 * it came and nothing of it is kept or logged here; the answer is the connection, which never
 * carries the token. Nothing the shop window is served changes with it, so no cache is dropped.
 */
export async function POST(request: NextRequest, context: RouteContext<"/api/stores/[slug]/integrations/meta-pixel/token">): Promise<NextResponse> {
  const refused = refuseCrossOrigin(request)
  if (refused) return refused

  const { slug } = await context.params
  const { status, payload } = await forwardSignedIn(request, { path: pathOf(slug), method: "POST", body: (await readJsonBody(request)) ?? {} })
  return NextResponse.json(payload, { status })
}

/** Remove the token and keep the pixel. The API's 204 becomes a 200 with an empty body, as every delete here. */
export async function DELETE(request: NextRequest, context: RouteContext<"/api/stores/[slug]/integrations/meta-pixel/token">): Promise<NextResponse> {
  const refused = refuseCrossOrigin(request)
  if (refused) return refused

  const { slug } = await context.params
  const { status, payload } = await forwardSignedIn(request, { path: pathOf(slug), method: "DELETE" })
  return NextResponse.json(status === 204 ? {} : payload, { status: status === 204 ? 200 : status })
}
