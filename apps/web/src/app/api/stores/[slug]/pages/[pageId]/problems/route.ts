// Next
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// App
import { forwardSignedIn, refuseCrossOrigin } from "@/lib/bff"

/** What Publicar would serve that the owner may not mean to: the list the publish dialog shows. */
export async function GET(
  request: NextRequest,
  context: RouteContext<"/api/stores/[slug]/pages/[pageId]/problems">,
): Promise<NextResponse> {
  const refused = refuseCrossOrigin(request)
  if (refused) return refused

  const { slug, pageId } = await context.params
  const { status, payload } = await forwardSignedIn(request, {
    path: `/stores/${encodeURIComponent(slug)}/pages/${encodeURIComponent(pageId)}/problems`,
    method: "GET",
  })

  return NextResponse.json(payload, { status })
}
