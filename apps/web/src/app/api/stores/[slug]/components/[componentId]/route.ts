// Next
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// App
import { forwardSignedIn, readJsonBody, refuseCrossOrigin } from "@/lib/bff"

/**
 * One component, addressed without its band.
 *
 * Not nested under `/sections/:id`, because a component's id is enough to find it and nesting
 * would make every edit carry a band id the editor has to keep in step — the exact bookkeeping
 * that once put a slide id where a section id belonged and had a form showing one thing while the
 * page showed another.
 */
export async function PATCH(
  request: NextRequest,
  context: RouteContext<"/api/stores/[slug]/components/[componentId]">,
): Promise<NextResponse> {
  const refused = refuseCrossOrigin(request)
  if (refused) return refused

  const { slug, componentId } = await context.params
  const { status, payload } = await forwardSignedIn(request, {
    path: `/stores/${encodeURIComponent(slug)}/components/${encodeURIComponent(componentId)}`,
    method: "PATCH",
    body: (await readJsonBody(request)) ?? {},
  })

  return NextResponse.json(payload, { status })
}

export async function DELETE(
  request: NextRequest,
  context: RouteContext<"/api/stores/[slug]/components/[componentId]">,
): Promise<NextResponse> {
  const refused = refuseCrossOrigin(request)
  if (refused) return refused

  const { slug, componentId } = await context.params
  const { status, payload } = await forwardSignedIn(request, {
    path: `/stores/${encodeURIComponent(slug)}/components/${encodeURIComponent(componentId)}`,
    method: "DELETE",
  })

  // 204 becomes 200 with an empty body, as every other delete here does: `NextResponse.json`
  // cannot write a 204, and one handler answering differently is one the client has to
  // special-case.
  return NextResponse.json(payload ?? {}, { status: status === 204 ? 200 : status })
}
