// Next
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// App
import { forwardSignedIn, refuseCrossOrigin } from "@/lib/bff"
import { revalidateStore } from "@/lib/revalidate"

/** A hidden copy of a band and its blocks, right after it. Nothing to send: the path names it. */
export async function POST(
  request: NextRequest,
  context: RouteContext<"/api/stores/[slug]/sections/[sectionId]/duplicate">,
): Promise<NextResponse> {
  const refused = refuseCrossOrigin(request)
  if (refused) return refused

  const { slug, sectionId } = await context.params
  const { status, payload } = await forwardSignedIn(request, {
    path: `/stores/${encodeURIComponent(slug)}/sections/${encodeURIComponent(sectionId)}/duplicate`,
    method: "POST",
  })

  // The copy is hidden until Publicar, but the page changed: the shop's cached page is dropped with it.
  if (status === 201) revalidateStore(slug)

  return NextResponse.json(payload, { status })
}
