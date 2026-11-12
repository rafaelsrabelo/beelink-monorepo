// Next
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// App
import { forwardSignedIn, readJsonBody, refuseCrossOrigin } from "@/lib/bff"

/** The shop's affiliate programme: its rules, its tables and the month's payout periods (IMPULSEIA-102). */
export async function GET(request: NextRequest, context: RouteContext<"/api/stores/[slug]/affiliate-program">): Promise<NextResponse> {
  const refused = refuseCrossOrigin(request)
  if (refused) return refused

  const { slug } = await context.params
  const { status, payload } = await forwardSignedIn(request, { path: `/stores/${slug}/affiliate-program`, method: "GET" })
  return NextResponse.json(payload, { status })
}

/** The rules saved, whole. Nothing the shop window serves reads them yet, so no cache is dropped. */
export async function PUT(request: NextRequest, context: RouteContext<"/api/stores/[slug]/affiliate-program">): Promise<NextResponse> {
  const refused = refuseCrossOrigin(request)
  if (refused) return refused

  const { slug } = await context.params
  const { status, payload } = await forwardSignedIn(request, { path: `/stores/${slug}/affiliate-program`, method: "PUT", body: (await readJsonBody(request)) ?? {} })
  return NextResponse.json(payload, { status })
}
