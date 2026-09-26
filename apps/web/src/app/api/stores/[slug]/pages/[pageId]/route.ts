// Next
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// App
import { forwardSignedIn, readJsonBody, refuseCrossOrigin } from "@/lib/bff"
import { revalidateStore } from "@/lib/revalidate"

/**
 * A patch of a landing: its name, address, menu mark, frame, status or search words.
 *
 * The shop is revalidated on every 2xx: a published landing and the shop's menu of them are cached
 * under the shop's tag, and a page taken down has to stop answering at once, not when its window ends.
 */
export async function PATCH(
  request: NextRequest,
  context: RouteContext<"/api/stores/[slug]/pages/[pageId]">,
): Promise<NextResponse> {
  const refused = refuseCrossOrigin(request)
  if (refused) return refused

  const { slug, pageId } = await context.params
  const { status, payload } = await forwardSignedIn(request, {
    path: `/stores/${encodeURIComponent(slug)}/pages/${encodeURIComponent(pageId)}`,
    method: "PATCH",
    body: (await readJsonBody(request)) ?? {},
  })

  if (status === 200) revalidateStore(slug)

  return NextResponse.json(payload, { status })
}
