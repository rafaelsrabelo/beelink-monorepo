// Next
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// App
import { forwardSignedIn, readJsonBody, refuseCrossOrigin } from "@/lib/bff"
import { revalidateStore } from "@/lib/revalidate"

const pathOf = (slug: string) => `/stores/${encodeURIComponent(slug)}/custom-domain`

/** The shop's own domain (BEELINK-285): where it stands, and the addresses to point it at — null where this deployment names none. */
export async function GET(request: NextRequest, context: RouteContext<"/api/stores/[slug]/custom-domain">): Promise<NextResponse> {
  const refused = refuseCrossOrigin(request)
  if (refused) return refused

  const { slug } = await context.params
  const { status, payload } = await forwardSignedIn(request, { path: pathOf(slug), method: "GET" })
  return NextResponse.json(payload, { status })
}

/**
 * Save the domain, or replace the one saved. The body goes as it came: the API alone reads what was
 * pasted down to a host and decides what a domain is. It checks the domain there and then, so the
 * answer may already be an active one.
 */
export async function PUT(request: NextRequest, context: RouteContext<"/api/stores/[slug]/custom-domain">): Promise<NextResponse> {
  const refused = refuseCrossOrigin(request)
  if (refused) return refused

  const { slug } = await context.params
  const { status, payload } = await forwardSignedIn(request, { path: pathOf(slug), method: "PUT", body: (await readJsonBody(request)) ?? {} })
  // The domain rides the shop's public data, which the shop window keeps under `store:<slug>`. The
  // proxy's copy of the hosts is not this handler's to drop: it follows within a minute (BEELINK-283).
  if (status >= 200 && status < 300) revalidateStore(slug)
  return NextResponse.json(payload, { status })
}

/** Remove the domain. The API's 204 becomes a 200 with an empty body, as every delete here. */
export async function DELETE(request: NextRequest, context: RouteContext<"/api/stores/[slug]/custom-domain">): Promise<NextResponse> {
  const refused = refuseCrossOrigin(request)
  if (refused) return refused

  const { slug } = await context.params
  const { status, payload } = await forwardSignedIn(request, { path: pathOf(slug), method: "DELETE" })
  // A shop window left with the domain would go on naming an address the shopkeeper took away.
  if (status >= 200 && status < 300) revalidateStore(slug)
  return NextResponse.json(status === 204 ? {} : payload, { status: status === 204 ? 200 : status })
}
