// Next
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// App
import { forwardSignedIn, readJsonBody, refuseCrossOrigin } from "@/lib/bff"

/** Every component of one band, in its new order. The band's own place does not change. */
export async function PUT(
  request: NextRequest,
  context: RouteContext<"/api/stores/[slug]/sections/[sectionId]/components/reorder">,
): Promise<NextResponse> {
  const refused = refuseCrossOrigin(request)
  if (refused) return refused

  const { slug, sectionId } = await context.params
  const { status, payload } = await forwardSignedIn(request, {
    path: `/stores/${encodeURIComponent(slug)}/sections/${encodeURIComponent(sectionId)}/components/reorder`,
    method: "PUT",
    body: (await readJsonBody(request)) ?? {},
  })

  return NextResponse.json(payload, { status })
}
