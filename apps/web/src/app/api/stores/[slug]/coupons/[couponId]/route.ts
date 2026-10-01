// Next
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// App
import { forwardSignedIn, readJsonBody, refuseCrossOrigin } from "@/lib/bff"

type Context = RouteContext<"/api/stores/[slug]/coupons/[couponId]">

async function write(request: NextRequest, context: Context, method: "PUT" | "PATCH"): Promise<NextResponse> {
  const refused = refuseCrossOrigin(request)
  if (refused) return refused

  const { slug, couponId } = await context.params
  const { status, payload } = await forwardSignedIn(request, {
    path: `/stores/${slug}/coupons/${encodeURIComponent(couponId)}`,
    method,
    body: (await readJsonBody(request)) ?? {},
  })
  return NextResponse.json(payload, { status })
}

/** The coupon replaced whole; the orders that used it keep what they took. */
export function PUT(request: NextRequest, context: Context): Promise<NextResponse> {
  return write(request, context, "PUT")
}

/** Paused, or switched back on. */
export function PATCH(request: NextRequest, context: Context): Promise<NextResponse> {
  return write(request, context, "PATCH")
}
