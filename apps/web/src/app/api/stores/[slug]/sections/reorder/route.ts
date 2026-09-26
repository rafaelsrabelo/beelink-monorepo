// Next
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// App
import { forwardSignedIn, pageQueryOf, readJsonBody, refuseCrossOrigin } from "@/lib/bff"

/** A page's whole list, in its new order — the home's, or the page `?pageId=` names. */
export async function PUT(
  request: NextRequest,
  context: RouteContext<"/api/stores/[slug]/sections/reorder">,
): Promise<NextResponse> {
  const refused = refuseCrossOrigin(request)
  if (refused) return refused

  const { slug } = await context.params
  const { status, payload } = await forwardSignedIn(request, {
    path: `/stores/${encodeURIComponent(slug)}/sections/reorder${pageQueryOf(request)}`,
    method: "PUT",
    body: (await readJsonBody(request)) ?? {},
  })

  return NextResponse.json(payload, { status })
}
