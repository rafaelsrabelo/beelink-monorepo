// Next
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// App
import { forwardSignedIn, refuseCrossOrigin } from "@/lib/bff"

/** The pages of the affiliate's area at one shop (IMPULSEIA-108): anything else is no route of this app. */
const READS = new Set(["products", "orders", "statement", "payouts"])
/** What a page may be asked for: the API validates the values, this keeps anything else from riding along. */
const QUERY = ["page", "pageSize", "q"] as const

/** One page of the affiliate's products with their links, orders, statement or payouts. */
export async function GET(request: NextRequest, context: RouteContext<"/api/affiliate/stores/[storeSlug]/[read]">): Promise<NextResponse> {
  const refused = refuseCrossOrigin(request)
  if (refused) return refused

  const { storeSlug, read } = await context.params
  if (!READS.has(read)) return NextResponse.json({ statusCode: 404, errorCode: "NOT_FOUND", message: "No such page of the affiliate's area" }, { status: 404 })

  const query = new URLSearchParams()
  for (const key of QUERY) {
    const value = request.nextUrl.searchParams.get(key)
    if (value) query.set(key, value)
  }
  const search = query.size > 0 ? `?${query.toString()}` : ""
  const { status, payload } = await forwardSignedIn(request, { path: `/affiliate/stores/${encodeURIComponent(storeSlug)}/${read}${search}`, method: "GET" })
  return NextResponse.json(payload, { status })
}
