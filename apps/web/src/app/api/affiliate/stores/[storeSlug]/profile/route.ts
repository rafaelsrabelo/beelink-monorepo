// Next
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// App
import { forwardSignedIn, readJsonBody, refuseCrossOrigin } from "@/lib/bff"
import { revalidateStore } from "@/lib/revalidate"

/**
 * The affiliate's own data at one shop (IMPULSEIA-108). The shop window keeps whom a visitor came by
 * under the shop's tag (IMPULSEIA-105), photo and phrase included: a change drops it.
 */
export async function PATCH(request: NextRequest, context: RouteContext<"/api/affiliate/stores/[storeSlug]/profile">): Promise<NextResponse> {
  const refused = refuseCrossOrigin(request)
  if (refused) return refused

  const { storeSlug } = await context.params
  const { status, payload } = await forwardSignedIn(request, { path: `/affiliate/stores/${encodeURIComponent(storeSlug)}/profile`, method: "PATCH", body: (await readJsonBody(request)) ?? {} })
  if (status >= 200 && status < 300) revalidateStore(storeSlug)
  return NextResponse.json(payload, { status })
}
