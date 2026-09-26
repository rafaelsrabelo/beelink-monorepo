// Next
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// App
import { forwardSignedIn, refuseCrossOrigin } from "@/lib/bff"

/**
 * A version copied into the page's draft. Nothing is revalidated: a restore does not publish, and
 * the shop serves what it served until Publicar.
 */
export async function POST(
  request: NextRequest,
  context: RouteContext<"/api/stores/[slug]/pages/[pageId]/versions/[versionId]/restore">,
): Promise<NextResponse> {
  const refused = refuseCrossOrigin(request)
  if (refused) return refused

  const { slug, pageId, versionId } = await context.params
  const { status, payload } = await forwardSignedIn(request, {
    path: `/stores/${encodeURIComponent(slug)}/pages/${encodeURIComponent(pageId)}/versions/${encodeURIComponent(versionId)}/restore`,
    method: "POST",
  })

  return NextResponse.json(payload, { status })
}
