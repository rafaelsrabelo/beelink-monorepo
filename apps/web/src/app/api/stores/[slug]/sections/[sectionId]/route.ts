// Next
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// App
import { forwardSignedIn, readJsonBody, refuseCrossOrigin } from "@/lib/bff"

export async function PUT(
  request: NextRequest,
  context: RouteContext<"/api/stores/[slug]/sections/[sectionId]">,
): Promise<NextResponse> {
  const refused = refuseCrossOrigin(request)
  if (refused) return refused

  const { slug, sectionId } = await context.params
  const { status, payload } = await forwardSignedIn(request, {
    path: `/stores/${encodeURIComponent(slug)}/sections/${encodeURIComponent(sectionId)}`,
    method: "PUT",
    body: (await readJsonBody(request)) ?? {},
  })

  return NextResponse.json(payload, { status })
}

export async function DELETE(
  request: NextRequest,
  context: RouteContext<"/api/stores/[slug]/sections/[sectionId]">,
): Promise<NextResponse> {
  const refused = refuseCrossOrigin(request)
  if (refused) return refused

  const { slug, sectionId } = await context.params
  const { status, payload } = await forwardSignedIn(request, {
    path: `/stores/${encodeURIComponent(slug)}/sections/${encodeURIComponent(sectionId)}`,
    method: "DELETE",
  })

  // 204 becomes 200 with an empty body, as every other delete here does: `NextResponse.json`
  // cannot write a 204, and one handler answering differently is one the client has to special-case.
  return NextResponse.json(payload ?? {}, { status: status === 204 ? 200 : status })
}
