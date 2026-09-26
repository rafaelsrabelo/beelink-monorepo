// Next
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// App
import { forwardSignedIn, readJsonBody, refuseCrossOrigin } from "@/lib/bff"
import { revalidateStore } from "@/lib/revalidate"

/**
 * Publicar: the page's draft frozen and served. The one write that changes what a visitor is served,
 * so the one that drops the shop's cached pages — the draft's own writes leave them alone.
 */
export async function POST(
  request: NextRequest,
  context: RouteContext<"/api/stores/[slug]/pages/[pageId]/publish">,
): Promise<NextResponse> {
  const refused = refuseCrossOrigin(request)
  if (refused) return refused

  const { slug, pageId } = await context.params
  const { status, payload } = await forwardSignedIn(request, {
    path: `/stores/${encodeURIComponent(slug)}/pages/${encodeURIComponent(pageId)}/publish`,
    method: "POST",
    body: (await readJsonBody(request)) ?? {},
  })

  if (status === 201) revalidateStore(slug)

  return NextResponse.json(payload, { status })
}
