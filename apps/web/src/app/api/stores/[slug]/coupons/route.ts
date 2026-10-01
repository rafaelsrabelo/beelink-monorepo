// Next
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// App
import { forwardSignedIn, readJsonBody, refuseCrossOrigin } from "@/lib/bff"

/** A page of the shop's coupons, by status. The query string goes whole: the API refuses what it does not declare. */
export async function GET(request: NextRequest, context: RouteContext<"/api/stores/[slug]/coupons">): Promise<NextResponse> {
  const refused = refuseCrossOrigin(request)
  if (refused) return refused

  const { slug } = await context.params
  const { status, payload } = await forwardSignedIn(request, { path: `/stores/${slug}/coupons${request.nextUrl.search}`, method: "GET" })
  return NextResponse.json(payload, { status })
}

/** A coupon created. Nothing a visitor is served changes: a coupon is read when it is typed, never cached. */
export async function POST(request: NextRequest, context: RouteContext<"/api/stores/[slug]/coupons">): Promise<NextResponse> {
  const refused = refuseCrossOrigin(request)
  if (refused) return refused

  const { slug } = await context.params
  const { status, payload } = await forwardSignedIn(request, { path: `/stores/${slug}/coupons`, method: "POST", body: (await readJsonBody(request)) ?? {} })
  return NextResponse.json(payload, { status })
}
