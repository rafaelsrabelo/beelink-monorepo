// Next
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// App
import { forwardSignedIn, readJsonBody, refuseCrossOrigin } from "@/lib/bff"
import { revalidateStore } from "@/lib/revalidate"

const pathOf = (slug: string) => `/stores/${encodeURIComponent(slug)}/integrations/google-analytics`

/** The shop's Google Analytics (BEELINK-302): its measurement ID and when it was saved, or disconnected. */
export async function GET(request: NextRequest, context: RouteContext<"/api/stores/[slug]/integrations/google-analytics">): Promise<NextResponse> {
  const refused = refuseCrossOrigin(request)
  if (refused) return refused

  const { slug } = await context.params
  const { status, payload } = await forwardSignedIn(request, { path: pathOf(slug), method: "GET" })
  return NextResponse.json(payload, { status })
}

/** Save the measurement ID, or replace the one saved. The body goes as it came: the API alone decides what an ID is. */
export async function POST(request: NextRequest, context: RouteContext<"/api/stores/[slug]/integrations/google-analytics">): Promise<NextResponse> {
  const refused = refuseCrossOrigin(request)
  if (refused) return refused

  const { slug } = await context.params
  const { status, payload } = await forwardSignedIn(request, { path: pathOf(slug), method: "POST", body: (await readJsonBody(request)) ?? {} })
  // The ID rides the shop's public data, which the shop window keeps under `store:<slug>`.
  if (status >= 200 && status < 300) revalidateStore(slug)
  return NextResponse.json(payload, { status })
}

/** Remove the ID. The API's 204 becomes a 200 with an empty body, as every delete here. */
export async function DELETE(request: NextRequest, context: RouteContext<"/api/stores/[slug]/integrations/google-analytics">): Promise<NextResponse> {
  const refused = refuseCrossOrigin(request)
  if (refused) return refused

  const { slug } = await context.params
  const { status, payload } = await forwardSignedIn(request, { path: pathOf(slug), method: "DELETE" })
  // A shop window left with the ID would go on naming a property the shopkeeper took away.
  if (status >= 200 && status < 300) revalidateStore(slug)
  return NextResponse.json(status === 204 ? {} : payload, { status: status === 204 ? 200 : status })
}
