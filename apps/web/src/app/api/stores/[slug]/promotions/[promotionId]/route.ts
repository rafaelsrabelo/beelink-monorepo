// Next
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// App
import { forwardSignedIn, readJsonBody, refuseCrossOrigin } from "@/lib/bff"
import { revalidateStore } from "@/lib/revalidate"

type Context = RouteContext<"/api/stores/[slug]/promotions/[promotionId]">

/** A write on one promotion: a 2xx drops the shop's cache, since it changes what a visitor is charged. */
async function write(request: NextRequest, context: Context, method: "PUT" | "PATCH"): Promise<NextResponse> {
  const refused = refuseCrossOrigin(request)
  if (refused) return refused

  const { slug, promotionId } = await context.params
  const { status, payload } = await forwardSignedIn(request, {
    path: `/stores/${slug}/promotions/${encodeURIComponent(promotionId)}`,
    method,
    body: (await readJsonBody(request)) ?? {},
  })
  if (status >= 200 && status < 300) revalidateStore(slug)
  return NextResponse.json(payload, { status })
}

/** The promotion replaced whole, with what it names. */
export function PUT(request: NextRequest, context: Context): Promise<NextResponse> {
  return write(request, context, "PUT")
}

/** Paused, or switched back on. */
export function PATCH(request: NextRequest, context: Context): Promise<NextResponse> {
  return write(request, context, "PATCH")
}
