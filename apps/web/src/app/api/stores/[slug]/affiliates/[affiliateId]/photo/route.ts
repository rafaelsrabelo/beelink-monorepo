// Next
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// App
import { forwardSignedIn, refuseCrossOrigin } from "@/lib/bff"
import { revalidateStore } from "@/lib/revalidate"

/**
 * The affiliate's photo taken off the shop window (IMPULSEIA-107). The window keeps whom a visitor came
 * by under the shop's tag (IMPULSEIA-105): the change goes with it.
 */
export async function DELETE(request: NextRequest, context: RouteContext<"/api/stores/[slug]/affiliates/[affiliateId]/photo">): Promise<NextResponse> {
  const refused = refuseCrossOrigin(request)
  if (refused) return refused

  const { slug, affiliateId } = await context.params
  const { status, payload } = await forwardSignedIn(request, { path: `/stores/${slug}/affiliates/${encodeURIComponent(affiliateId)}/photo`, method: "DELETE" })
  if (status >= 200 && status < 300) revalidateStore(slug)
  return NextResponse.json(payload, { status })
}
