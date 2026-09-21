// Next
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// App
import { forwardSignedIn, readJsonBody, refuseCrossOrigin } from "@/lib/bff"
import { revalidateStore } from "@/lib/revalidate"

/**
 * The shopkeeper's own categories — everything, including the hidden ones and the empty ones.
 *
 * A different path from `/stores/:slug/catalog`, which is what a visitor is served: that one drops
 * a category with nothing available in it, which is right for a shop window and wrong for the
 * screen where a shopkeeper is about to put the first product into a category they just made.
 */
export async function GET(
  request: NextRequest,
  context: RouteContext<"/api/stores/[slug]/product-categories">,
): Promise<NextResponse> {
  const refused = refuseCrossOrigin(request)
  if (refused) return refused

  const { slug } = await context.params
  const { status, payload } = await forwardSignedIn(request, {
    path: `/stores/${slug}/product-categories`,
    method: "GET",
  })

  return NextResponse.json(payload, { status })
}

export async function POST(
  request: NextRequest,
  context: RouteContext<"/api/stores/[slug]/product-categories">,
): Promise<NextResponse> {
  const refused = refuseCrossOrigin(request)
  if (refused) return refused

  const { slug } = await context.params
  const { status, payload } = await forwardSignedIn(request, {
    path: `/stores/${slug}/product-categories`,
    method: "POST",
    body: (await readJsonBody(request)) ?? {},
  })

  // The window caches the category band and the catalogue under this shop's tags. A shopkeeper who
  // saves and then opens their own shop expects to see it, not to wait out an ISR window.
  if (status === 201) revalidateStore(slug)

  return NextResponse.json(payload, { status })
}
