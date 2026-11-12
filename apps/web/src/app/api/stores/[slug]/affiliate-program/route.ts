// Next
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// App
import { forwardSignedIn, readJsonBody, refuseCrossOrigin } from "@/lib/bff"
import { revalidateStore } from "@/lib/revalidate"

/** The shop's affiliate programme: its rules, its tables and the month's payout periods (IMPULSEIA-102). */
export async function GET(request: NextRequest, context: RouteContext<"/api/stores/[slug]/affiliate-program">): Promise<NextResponse> {
  const refused = refuseCrossOrigin(request)
  if (refused) return refused

  const { slug } = await context.params
  const { status, payload } = await forwardSignedIn(request, { path: `/stores/${slug}/affiliate-program`, method: "GET" })
  return NextResponse.json(payload, { status })
}

/**
 * The rules saved, whole. The shop window reads whether the programme is on (IMPULSEIA-105): an
 * affiliate's link credits nobody while it is off, so the shop's kept answers go with the save.
 */
export async function PUT(request: NextRequest, context: RouteContext<"/api/stores/[slug]/affiliate-program">): Promise<NextResponse> {
  const refused = refuseCrossOrigin(request)
  if (refused) return refused

  const { slug } = await context.params
  const { status, payload } = await forwardSignedIn(request, { path: `/stores/${slug}/affiliate-program`, method: "PUT", body: (await readJsonBody(request)) ?? {} })
  if (status >= 200 && status < 300) revalidateStore(slug)
  return NextResponse.json(payload, { status })
}
