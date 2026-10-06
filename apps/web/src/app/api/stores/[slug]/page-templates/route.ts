// Next
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// App
import { forwardSignedIn, refuseCrossOrigin } from "@/lib/bff"

/** The models a page may be arranged with — the home's unless `?pageId=`. It only lists. */
export async function GET(
  request: NextRequest,
  context: RouteContext<"/api/stores/[slug]/page-templates">,
): Promise<NextResponse> {
  const refused = refuseCrossOrigin(request)
  if (refused) return refused

  const { slug } = await context.params
  const pageId = request.nextUrl.searchParams.get("pageId")
  const query = pageId ? `?${new URLSearchParams({ pageId }).toString()}` : ""

  const { status, payload } = await forwardSignedIn(request, {
    path: `/stores/${encodeURIComponent(slug)}/page-templates${query}`,
    method: "GET",
  })

  return NextResponse.json(payload, { status })
}
