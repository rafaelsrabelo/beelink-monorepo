// Next
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// App
import { forwardSignedIn, refuseCrossOrigin } from "@/lib/bff"

/** The shop's Melhor Envio wallet and the services it offers, read there and then (BEELINK-183). */
export async function GET(request: NextRequest, context: RouteContext<"/api/stores/[slug]/integrations/melhor-envio/account">): Promise<NextResponse> {
  const refused = refuseCrossOrigin(request)
  if (refused) return refused

  const { slug } = await context.params
  const { status, payload } = await forwardSignedIn(request, { path: `/stores/${encodeURIComponent(slug)}/integrations/melhor-envio/account`, method: "GET" })
  return NextResponse.json(payload, { status })
}
