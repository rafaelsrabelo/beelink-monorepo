// Next
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// App
import { forwardSignedIn, refuseCrossOrigin } from "@/lib/bff"

type Context = RouteContext<"/api/stores/[slug]/affiliate-applications">

/** What the list may be asked for: the API validates the values, this keeps anything else from riding along. */
const LIST_QUERY = ["status", "page", "pageSize"] as const

/** The applications the shop's page took, newest first, by status (plan 2026-11-14). */
export async function GET(request: NextRequest, context: Context): Promise<NextResponse> {
  const refused = refuseCrossOrigin(request)
  if (refused) return refused

  const { slug } = await context.params
  const query = new URLSearchParams()
  for (const key of LIST_QUERY) {
    const value = request.nextUrl.searchParams.get(key)
    if (value) query.set(key, value)
  }
  const search = query.size > 0 ? `?${query.toString()}` : ""
  const { status, payload } = await forwardSignedIn(request, { path: `/stores/${slug}/affiliate-applications${search}`, method: "GET" })
  return NextResponse.json(payload, { status })
}
