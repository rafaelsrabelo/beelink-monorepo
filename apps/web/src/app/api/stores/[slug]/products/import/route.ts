// Next
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// App
import { forwardSignedIn, readJsonBody, refuseCrossOrigin } from "@/lib/bff"
import { revalidateStore } from "@/lib/revalidate"

/**
 * The drafts the shopkeeper confirmed, created. They are drafts and serve nobody, but a category
 * may be created with them, and a new category is something the shop window lists — so a 201
 * drops what it cached, as a product's creation does.
 */
export async function POST(
  request: NextRequest,
  context: RouteContext<"/api/stores/[slug]/products/import">,
): Promise<NextResponse> {
  const refused = refuseCrossOrigin(request)
  if (refused) return refused

  const { slug } = await context.params
  const { status, payload } = await forwardSignedIn(request, {
    path: `/stores/${encodeURIComponent(slug)}/products/import`,
    method: "POST",
    body: (await readJsonBody(request)) ?? {},
  })

  if (status === 201) revalidateStore(slug)

  return NextResponse.json(payload, { status })
}
