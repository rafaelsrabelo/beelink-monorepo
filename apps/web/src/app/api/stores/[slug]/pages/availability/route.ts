// Next
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// App
import { forwardSignedIn, refuseCrossOrigin } from "@/lib/bff"

/** Whether an address is free for a landing, normalised as the API would store it. */
export async function GET(
  request: NextRequest,
  context: RouteContext<"/api/stores/[slug]/pages/availability">,
): Promise<NextResponse> {
  const refused = refuseCrossOrigin(request)
  if (refused) return refused

  const { slug } = await context.params
  const query = new URLSearchParams()
  const candidate = request.nextUrl.searchParams.get("slug")
  const except = request.nextUrl.searchParams.get("except")
  if (candidate !== null) query.set("slug", candidate)
  if (except) query.set("except", except)

  const { status, payload } = await forwardSignedIn(request, {
    path: `/stores/${encodeURIComponent(slug)}/pages/availability?${query.toString()}`,
    method: "GET",
  })

  return NextResponse.json(payload, { status })
}
