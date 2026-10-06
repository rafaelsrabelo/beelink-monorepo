// Next
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// App
import { forwardSignedIn, refuseCrossOrigin } from "@/lib/bff"
import { revalidateStore } from "@/lib/revalidate"

/**
 * Asks Asaas again, now, whether it approved the shop's account (BEELINK-278): the connection as it
 * then stands. The checkout offers Pix and card by that answer, so what the shop window kept of its
 * ways of paying is dropped whenever Asaas was heard — approved since, or no longer.
 */
export async function POST(request: NextRequest, context: RouteContext<"/api/stores/[slug]/integrations/asaas/approval">): Promise<NextResponse> {
  const refused = refuseCrossOrigin(request)
  if (refused) return refused

  const { slug } = await context.params
  const { status, payload } = await forwardSignedIn(request, { path: `/stores/${encodeURIComponent(slug)}/integrations/asaas/approval`, method: "POST", body: {} })
  if (status >= 200 && status < 300) revalidateStore(slug)
  return NextResponse.json(payload, { status })
}
