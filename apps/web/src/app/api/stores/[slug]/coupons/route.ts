// Next
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// App
import { forwardSignedIn, readJsonBody, refuseCrossOrigin } from "@/lib/bff"
import { revalidateOffers } from "@/lib/revalidate"

/** A page of the shop's coupons, by status. The query string goes whole: the API refuses what it does not declare. */
export async function GET(request: NextRequest, context: RouteContext<"/api/stores/[slug]/coupons">): Promise<NextResponse> {
  const refused = refuseCrossOrigin(request)
  if (refused) return refused

  const { slug } = await context.params
  const { status, payload } = await forwardSignedIn(request, { path: `/stores/${slug}/coupons${request.nextUrl.search}`, method: "GET" })
  return NextResponse.json(payload, { status })
}

/**
 * A coupon created. One switched on to be shown may be the shop's first-purchase headline, which
 * the shop window keeps: a 2xx drops it (`revalidateOffers`) — it alone, since a coupon is in no
 * catalogue. Whether a code is taken is still read when it is typed, never cached.
 */
export async function POST(request: NextRequest, context: RouteContext<"/api/stores/[slug]/coupons">): Promise<NextResponse> {
  const refused = refuseCrossOrigin(request)
  if (refused) return refused

  const { slug } = await context.params
  const { status, payload } = await forwardSignedIn(request, { path: `/stores/${slug}/coupons`, method: "POST", body: (await readJsonBody(request)) ?? {} })
  if (status >= 200 && status < 300) revalidateOffers(slug)
  return NextResponse.json(payload, { status })
}
