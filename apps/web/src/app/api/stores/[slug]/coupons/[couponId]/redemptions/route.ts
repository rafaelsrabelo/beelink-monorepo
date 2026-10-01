// Next
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// App
import { forwardSignedIn, refuseCrossOrigin } from "@/lib/bff"

/** A page of the orders a coupon went into, the most recent first. */
export async function GET(request: NextRequest, context: RouteContext<"/api/stores/[slug]/coupons/[couponId]/redemptions">): Promise<NextResponse> {
  const refused = refuseCrossOrigin(request)
  if (refused) return refused

  const { slug, couponId } = await context.params
  const { status, payload } = await forwardSignedIn(request, {
    path: `/stores/${slug}/coupons/${encodeURIComponent(couponId)}/redemptions${request.nextUrl.search}`,
    method: "GET",
  })
  return NextResponse.json(payload, { status })
}
