// Next
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// App
import { forwardSignedIn, refuseCrossOrigin } from "@/lib/bff"

/** The shop's Melhor Envio connection, and whether this deployment can make one (BEELINK-182). */
export async function GET(request: NextRequest, context: RouteContext<"/api/stores/[slug]/integrations/melhor-envio">): Promise<NextResponse> {
  const refused = refuseCrossOrigin(request)
  if (refused) return refused

  const { slug } = await context.params
  const { status, payload } = await forwardSignedIn(request, { path: `/stores/${encodeURIComponent(slug)}/integrations/melhor-envio`, method: "GET" })
  return NextResponse.json(payload, { status })
}

/** Disconnect: the API deletes the tokens. Its 204 becomes a 200 with an empty body, as every delete here. */
export async function DELETE(request: NextRequest, context: RouteContext<"/api/stores/[slug]/integrations/melhor-envio">): Promise<NextResponse> {
  const refused = refuseCrossOrigin(request)
  if (refused) return refused

  const { slug } = await context.params
  const { status, payload } = await forwardSignedIn(request, { path: `/stores/${encodeURIComponent(slug)}/integrations/melhor-envio`, method: "DELETE" })
  return NextResponse.json(status === 204 ? {} : payload, { status: status === 204 ? 200 : status })
}
