// Next
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// App
import { forwardSignedIn, refuseCrossOrigin } from "@/lib/bff"

/** The label's PDF, at a public address Melhor Envio makes there and then (BEELINK-187). */
export async function POST(request: NextRequest, context: RouteContext<"/api/stores/[slug]/orders/[number]/label/print">): Promise<NextResponse> {
  const refused = refuseCrossOrigin(request)
  if (refused) return refused

  const { slug, number } = await context.params
  const { status, payload } = await forwardSignedIn(request, { path: `/stores/${encodeURIComponent(slug)}/orders/${encodeURIComponent(number)}/label/print`, method: "POST", body: {} })
  return NextResponse.json(payload, { status })
}
