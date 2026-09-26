// Next
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// App
import { forwardSignedIn, pageQueryOf, readJsonBody, refuseCrossOrigin } from "@/lib/bff"

/**
 * A page's bands, hidden ones included: the home's, or the page `?pageId=` names.
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
    path: `/stores/${encodeURIComponent(slug)}/sections${pageQueryOf(request)}`,
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
    path: `/stores/${encodeURIComponent(slug)}/sections${pageQueryOf(request)}`,
    method: "POST",
    body: (await readJsonBody(request)) ?? {},
  })

  return NextResponse.json(payload, { status })
}
