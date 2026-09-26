// Next
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// App
import { forwardSignedIn, refuseCrossOrigin } from "@/lib/bff"

/** A page's draft — every band and block, hidden ones too — and whether it differs from what is served. */
export async function GET(
  request: NextRequest,
  context: RouteContext<"/api/stores/[slug]/pages/[pageId]/draft">,
): Promise<NextResponse> {
  const refused = refuseCrossOrigin(request)
  if (refused) return refused

  const { slug, pageId } = await context.params
  const { status, payload } = await forwardSignedIn(request, {
    path: `/stores/${encodeURIComponent(slug)}/pages/${encodeURIComponent(pageId)}/draft`,
    method: "GET",
  })

  return NextResponse.json(payload, { status })
}
