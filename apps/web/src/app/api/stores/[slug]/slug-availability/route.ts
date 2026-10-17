// Next
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// App
import { forwardSignedIn, refuseCrossOrigin } from "@/lib/bff"

/** Whether an address may be the page's new one, normalised as the API would store it (BEELINK-331). */
export async function GET(request: NextRequest, context: RouteContext<"/api/stores/[slug]/slug-availability">): Promise<NextResponse> {
  const refused = refuseCrossOrigin(request)
  if (refused) return refused

  const { slug } = await context.params
  const query = new URLSearchParams({ slug: request.nextUrl.searchParams.get("slug") ?? "" })

  const { status, payload } = await forwardSignedIn(request, {
    path: `/stores/${encodeURIComponent(slug)}/slug-availability?${query.toString()}`,
    method: "GET",
  })

  return NextResponse.json(payload, { status })
}
