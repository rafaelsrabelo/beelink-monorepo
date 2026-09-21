// Next
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// App
import { forwardSignedIn, readJsonBody, refuseCrossOrigin } from "@/lib/bff"
import { revalidateStore } from "@/lib/revalidate"

type Context = RouteContext<"/api/stores/[slug]/product-categories/[categoryId]">

export async function PUT(request: NextRequest, context: Context): Promise<NextResponse> {
  const refused = refuseCrossOrigin(request)
  if (refused) return refused

  const { slug, categoryId } = await context.params
  const { status, payload } = await forwardSignedIn(request, {
    path: `/stores/${slug}/product-categories/${categoryId}`,
    method: "PUT",
    body: (await readJsonBody(request)) ?? {},
  })

  if (status === 200) revalidateStore(slug)

  return NextResponse.json(payload, { status })
}

/**
 * Deleting a category does not delete its products — the relation is `SetNull`, so they land
 * uncategorised and stay reachable at their own addresses. Its subcategories do go, by cascade.
 */
export async function DELETE(request: NextRequest, context: Context): Promise<NextResponse> {
  const refused = refuseCrossOrigin(request)
  if (refused) return refused

  const { slug, categoryId } = await context.params
  const { status, payload } = await forwardSignedIn(request, {
    path: `/stores/${slug}/product-categories/${categoryId}`,
    method: "DELETE",
  })

  if (status === 200 || status === 204) revalidateStore(slug)

  return NextResponse.json(payload ?? {}, { status: status === 204 ? 200 : status })
}
