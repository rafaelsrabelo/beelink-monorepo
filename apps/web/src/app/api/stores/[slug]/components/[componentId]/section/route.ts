// Next
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// App
import { forwardSignedIn, readJsonBody, refuseCrossOrigin } from "@/lib/bff"

/**
 * One component into another band, or to another place in its own. Answered with the whole page:
 * two bands changed, and the one it left may be gone.
 */
export async function PUT(
  request: NextRequest,
  context: RouteContext<"/api/stores/[slug]/components/[componentId]/section">,
): Promise<NextResponse> {
  const refused = refuseCrossOrigin(request)
  if (refused) return refused

  const { slug, componentId } = await context.params
  const { status, payload } = await forwardSignedIn(request, {
    path: `/stores/${encodeURIComponent(slug)}/components/${encodeURIComponent(componentId)}/section`,
    method: "PUT",
    body: (await readJsonBody(request)) ?? {},
  })

  return NextResponse.json(payload, { status })
}
