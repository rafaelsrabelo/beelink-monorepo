// Next
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// App
import { forwardSignedIn, readJsonBody, refuseCrossOrigin } from "@/lib/bff"
import { revalidateStore } from "@/lib/revalidate"

/**
 * A coupon of bee-link's used on the page (BEELINK-224): `{ code }` goes as it came, and the answer is
 * the page's subscription as it then reads — free for a month. The API limits it per address, and
 * `forwardSignedIn` hands it the shopkeeper's address, not this server's.
 *
 * A page given its month may have been off the air a moment ago, locked for want of payment
 * (BEELINK-223): its shop window is dropped from the cache on every coupon taken, so the page is
 * served again at once. On one that was open it changes nothing, and a page takes one coupon in its
 * life.
 */
export async function POST(request: NextRequest, context: RouteContext<"/api/stores/[slug]/subscription/coupon">): Promise<NextResponse> {
  const refused = refuseCrossOrigin(request)
  if (refused) return refused

  const { slug } = await context.params
  const { status, payload } = await forwardSignedIn(request, { path: `/stores/${encodeURIComponent(slug)}/subscription/coupon`, method: "POST", body: (await readJsonBody(request)) ?? {} })
  if (status === 200) revalidateStore(slug)
  return NextResponse.json(payload, { status })
}
