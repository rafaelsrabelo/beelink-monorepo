// Next
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// App
import { forwardSignedIn, refuseCrossOrigin } from "@/lib/bff"

/** What the statement may be asked for: the API validates the values, this keeps anything else from riding along. */
const STATEMENT_QUERY = ["page", "pageSize"] as const

/** An affiliate's balances and a page of their statement (IMPULSEIA-107). */
export async function GET(request: NextRequest, context: RouteContext<"/api/stores/[slug]/affiliates/[affiliateId]/statement">): Promise<NextResponse> {
  const refused = refuseCrossOrigin(request)
  if (refused) return refused

  const { slug, affiliateId } = await context.params
  const query = new URLSearchParams()
  for (const key of STATEMENT_QUERY) {
    const value = request.nextUrl.searchParams.get(key)
    if (value) query.set(key, value)
  }
  const search = query.size > 0 ? `?${query.toString()}` : ""
  const { status, payload } = await forwardSignedIn(request, { path: `/stores/${slug}/affiliates/${encodeURIComponent(affiliateId)}/statement${search}`, method: "GET" })
  return NextResponse.json(payload, { status })
}
