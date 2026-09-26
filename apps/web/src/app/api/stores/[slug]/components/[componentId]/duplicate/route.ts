// Next
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// App
import { forwardSignedIn, refuseCrossOrigin } from "@/lib/bff"
import { revalidateStore } from "@/lib/revalidate"

/** A hidden copy of one block, right after it in its band. Nothing to send: the path names it. */
export async function POST(
  request: NextRequest,
  context: RouteContext<"/api/stores/[slug]/components/[componentId]/duplicate">,
): Promise<NextResponse> {
  const refused = refuseCrossOrigin(request)
  if (refused) return refused

  const { slug, componentId } = await context.params
  const { status, payload } = await forwardSignedIn(request, {
    path: `/stores/${encodeURIComponent(slug)}/components/${encodeURIComponent(componentId)}/duplicate`,
    method: "POST",
  })

  // The copy is hidden until Publicar, but the page changed: the shop's cached page is dropped with it.
  if (status === 201) revalidateStore(slug)

  return NextResponse.json(payload, { status })
}
