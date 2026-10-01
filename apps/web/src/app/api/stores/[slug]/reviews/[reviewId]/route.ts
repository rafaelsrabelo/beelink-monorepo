// Next
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// App
import { forwardSignedIn, readJsonBody, refuseCrossOrigin } from "@/lib/bff"
import { revalidateStore } from "@/lib/revalidate"

/**
 * One review hidden from the shop window, or published again. It changes what the window serves —
 * a product's reviews and its card's rating — so a 2xx drops the shop's cache (`revalidateStore`).
 */
export async function PATCH(request: NextRequest, context: RouteContext<"/api/stores/[slug]/reviews/[reviewId]">): Promise<NextResponse> {
  const refused = refuseCrossOrigin(request)
  if (refused) return refused

  const { slug, reviewId } = await context.params
  const { status, payload } = await forwardSignedIn(request, {
    path: `/stores/${slug}/reviews/${encodeURIComponent(reviewId)}`,
    method: "PATCH",
    body: (await readJsonBody(request)) ?? {},
  })
  if (status >= 200 && status < 300) revalidateStore(slug)
  return NextResponse.json(payload, { status })
}
