// Next
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// App
import { forwardSignedIn, refuseCrossOrigin } from "@/lib/bff"

/** Every version of a page, newest first; the newest is live while the page is up. */
export async function GET(
  request: NextRequest,
  context: RouteContext<"/api/stores/[slug]/pages/[pageId]/versions">,
): Promise<NextResponse> {
  const refused = refuseCrossOrigin(request)
  if (refused) return refused

  const { slug, pageId } = await context.params
  const { status, payload } = await forwardSignedIn(request, {
    path: `/stores/${encodeURIComponent(slug)}/pages/${encodeURIComponent(pageId)}/versions`,
    method: "GET",
  })

  return NextResponse.json(payload, { status })
}
