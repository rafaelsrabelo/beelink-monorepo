// Next
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// App
import { forwardSignedIn, readJsonBody, refuseCrossOrigin } from "@/lib/bff"

/**
 * A model written over the page's draft, naming the revision the editor read (`forwardSignedIn`
 * passes `x-page-revision` on). Nothing is revalidated: applying does not publish, and the shop
 * serves what it served until Publicar.
 */
export async function POST(
  request: NextRequest,
  context: RouteContext<"/api/stores/[slug]/pages/[pageId]/apply-template">,
): Promise<NextResponse> {
  const refused = refuseCrossOrigin(request)
  if (refused) return refused

  const { slug, pageId } = await context.params
  const { status, payload } = await forwardSignedIn(request, {
    path: `/stores/${encodeURIComponent(slug)}/pages/${encodeURIComponent(pageId)}/apply-template`,
    method: "POST",
    body: (await readJsonBody(request)) ?? {},
  })

  return NextResponse.json(payload, { status })
}
