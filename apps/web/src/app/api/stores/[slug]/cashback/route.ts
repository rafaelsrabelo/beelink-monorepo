// Next
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// App
import { forwardSignedIn, readJsonBody, refuseCrossOrigin } from "@/lib/bff"
import { revalidateStore } from "@/lib/revalidate"

/** The shop's cashback rules and what it owes (BEELINK-242). */
export async function GET(request: NextRequest, context: RouteContext<"/api/stores/[slug]/cashback">): Promise<NextResponse> {
  const refused = refuseCrossOrigin(request)
  if (refused) return refused

  const { slug } = await context.params
  const { status, payload } = await forwardSignedIn(request, { path: `/stores/${slug}/cashback`, method: "GET" })
  return NextResponse.json(payload, { status })
}

/**
 * The rules saved, whole. The body goes as it came: the API refuses a rule out of range, or one left
 * out. The shop window says the shop's cashback (BEELINK-243), so a 2xx drops the shop's cache.
 */
export async function PUT(request: NextRequest, context: RouteContext<"/api/stores/[slug]/cashback">): Promise<NextResponse> {
  const refused = refuseCrossOrigin(request)
  if (refused) return refused

  const { slug } = await context.params
  const { status, payload } = await forwardSignedIn(request, { path: `/stores/${slug}/cashback`, method: "PUT", body: (await readJsonBody(request)) ?? {} })
  if (status >= 200 && status < 300) revalidateStore(slug)
  return NextResponse.json(payload, { status })
}
