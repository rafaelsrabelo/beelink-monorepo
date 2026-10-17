// Next
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// Types
import type { Store } from "@harness-monorepo/contracts"

// App
import { forwardSignedIn, readJsonBody, refuseCrossOrigin } from "@/lib/bff"
import { revalidateOffers, revalidateStore } from "@/lib/revalidate"

/**
 * The page's new address (BEELINK-331). The API holds the rules — the creation's, once every 30
 * days, the old address reserved — and answers the page at the new one.
 *
 * Both shop windows are dropped on a 200: the old address's, which would go on serving the page kept
 * under an address it left, and the new one's, which may hold a 404 kept from before it was taken.
 */
export async function PUT(request: NextRequest, context: RouteContext<"/api/stores/[slug]/slug">): Promise<NextResponse> {
  const refused = refuseCrossOrigin(request)
  if (refused) return refused

  const { slug } = await context.params
  const { status, payload } = await forwardSignedIn(request, {
    path: `/stores/${encodeURIComponent(slug)}/slug`,
    method: "PUT",
    body: (await readJsonBody(request)) ?? {},
  })

  if (status === 200) {
    const moved = (payload as Store).slug
    for (const address of new Set([slug, moved])) {
      revalidateStore(address)
      revalidateOffers(address)
    }
  }

  return NextResponse.json(payload, { status })
}
