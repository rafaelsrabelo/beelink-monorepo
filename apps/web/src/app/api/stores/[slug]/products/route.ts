// Next
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// App
import { forwardSignedIn, readJsonBody, refuseCrossOrigin } from "@/lib/bff"
import { revalidateStore } from "@/lib/revalidate"

/**
 * The shopkeeper's own products — the unavailable ones included.
 *
 * A different path from the storefront's catalogue, which hides them. This is the screen where one
 * is put back on sale, so leaving it out would make that impossible.
 */
export async function GET(
  request: NextRequest,
  context: RouteContext<"/api/stores/[slug]/products">,
): Promise<NextResponse> {
  const refused = refuseCrossOrigin(request)
  if (refused) return refused

  const { slug } = await context.params
  const { status, payload } = await forwardSignedIn(request, {
    path: `/stores/${slug}/products`,
    method: "GET",
  })

  return NextResponse.json(payload, { status })
}

export async function POST(
  request: NextRequest,
  context: RouteContext<"/api/stores/[slug]/products">,
): Promise<NextResponse> {
  const refused = refuseCrossOrigin(request)
  if (refused) return refused

  const { slug } = await context.params
  const { status, payload } = await forwardSignedIn(request, {
    path: `/stores/${slug}/products`,
    method: "POST",
    body: (await readJsonBody(request)) ?? {},
  })

  if (status === 201) revalidateStore(slug)

  return NextResponse.json(payload, { status })
}
