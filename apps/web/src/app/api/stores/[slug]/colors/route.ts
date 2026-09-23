// Next
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// App
import { forwardSignedIn, readJsonBody, refuseCrossOrigin } from "@/lib/bff"
import { revalidateStore } from "@/lib/revalidate"

/**
 * The shop's four colours, and nothing else it owns.
 *
 * Its own route rather than a field of `PUT /stores/:slug`, because that one is a full replacement
 * — omitting `layoutSettings` empties the column. Two screens that both re-post the whole shop are
 * two screens that overwrite each other with whatever they last read, and design mode is now the
 * second of them.
 */
export async function PUT(
  request: NextRequest,
  context: RouteContext<"/api/stores/[slug]/colors">,
): Promise<NextResponse> {
  const refused = refuseCrossOrigin(request)
  if (refused) return refused

  const body = await readJsonBody(request)
  const { slug } = await context.params

  const { status, payload } = await forwardSignedIn(request, {
    path: `/stores/${encodeURIComponent(slug)}/colors`,
    method: "PUT",
    body,
  })

  // The shop window paints from these, so a cached answer is the old palette on a live page.
  if (status < 400) await revalidateStore(slug)

  return NextResponse.json(payload, { status })
}
