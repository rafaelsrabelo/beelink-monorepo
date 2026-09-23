// Next
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// App
import { forwardSignedIn, readJsonBody, refuseCrossOrigin } from "@/lib/bff"
import { revalidateStore } from "@/lib/revalidate"

/** Adds a component to a band that already exists. A new band is created through `../..`. */
export async function POST(
  request: NextRequest,
  context: RouteContext<"/api/stores/[slug]/sections/[sectionId]/components">,
): Promise<NextResponse> {
  const refused = refuseCrossOrigin(request)
  if (refused) return refused

  const { slug, sectionId } = await context.params
  const { status, payload } = await forwardSignedIn(request, {
    path: `/stores/${encodeURIComponent(slug)}/sections/${encodeURIComponent(sectionId)}/components`,
    method: "POST",
    body: (await readJsonBody(request)) ?? {},
  })

  // A component rides on the shop, which the window caches under this shop's tag. Without this, a
  // shopkeeper saves a poster and then looks at their own landing page and does not see it.
  if (status === 201) revalidateStore(slug)

  return NextResponse.json(payload, { status })
}
