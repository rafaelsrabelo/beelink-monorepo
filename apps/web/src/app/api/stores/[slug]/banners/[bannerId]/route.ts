// Next
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// App
import { forwardSignedIn, readJsonBody, refuseCrossOrigin } from "@/lib/bff"
import { revalidateStore } from "@/lib/revalidate"

export async function PUT(
  request: NextRequest,
  context: RouteContext<"/api/stores/[slug]/banners/[bannerId]">,
): Promise<NextResponse> {
  const refused = refuseCrossOrigin(request)
  if (refused) return refused

  const { slug, bannerId } = await context.params
  const { status, payload } = await forwardSignedIn(request, {
    path: `/stores/${encodeURIComponent(slug)}/banners/${encodeURIComponent(bannerId)}`,
    method: "PUT",
    body: (await readJsonBody(request)) ?? {},
  })

  if (status === 200) revalidateStore(slug)

  return NextResponse.json(payload, { status })
}

export async function DELETE(
  request: NextRequest,
  context: RouteContext<"/api/stores/[slug]/banners/[bannerId]">,
): Promise<NextResponse> {
  const refused = refuseCrossOrigin(request)
  if (refused) return refused

  const { slug, bannerId } = await context.params
  const { status, payload } = await forwardSignedIn(request, {
    path: `/stores/${encodeURIComponent(slug)}/banners/${encodeURIComponent(bannerId)}`,
    method: "DELETE",
  })

  if (status === 200 || status === 204) revalidateStore(slug)

  // 204 becomes 200 with an empty body, as every other delete here does: `NextResponse.json`
  // cannot write a 204, and one handler answering differently is one the client has to special-case.
  return NextResponse.json(payload ?? {}, { status: status === 204 ? 200 : status })
}
