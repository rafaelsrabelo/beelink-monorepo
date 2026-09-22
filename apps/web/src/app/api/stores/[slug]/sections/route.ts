// Next
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// App
import { forwardSignedIn, readJsonBody, refuseCrossOrigin } from "@/lib/bff"
import { revalidateStore } from "@/lib/revalidate"

/**
 * The shop's posters, hidden ones included.
 *
 * There is no anonymous twin of this route, and that is deliberate: a visitor never asks for
 * banners on their own. They arrive already resolved on the shop itself, which the window fetches
 * first and unconditionally, so a second public endpoint would be a second round trip for
 * something already in hand.
 */
export async function GET(
  request: NextRequest,
  context: RouteContext<"/api/stores/[slug]/sections">,
): Promise<NextResponse> {
  const refused = refuseCrossOrigin(request)
  if (refused) return refused

  const { slug } = await context.params
  const { status, payload } = await forwardSignedIn(request, {
    path: `/stores/${encodeURIComponent(slug)}/sections`,
    method: "GET",
  })

  return NextResponse.json(payload, { status })
}

export async function POST(
  request: NextRequest,
  context: RouteContext<"/api/stores/[slug]/sections">,
): Promise<NextResponse> {
  const refused = refuseCrossOrigin(request)
  if (refused) return refused

  const { slug } = await context.params
  const { status, payload } = await forwardSignedIn(request, {
    path: `/stores/${encodeURIComponent(slug)}/sections`,
    method: "POST",
    body: (await readJsonBody(request)) ?? {},
  })

  // A banner rides on the shop, which the window caches under this shop's tag. Without this, a
  // shopkeeper saves a poster and then looks at their own landing page and does not see it.
  if (status === 201) revalidateStore(slug)

  return NextResponse.json(payload, { status })
}
