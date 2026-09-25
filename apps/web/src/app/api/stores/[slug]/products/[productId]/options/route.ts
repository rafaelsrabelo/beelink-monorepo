// Next
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// App
import { forwardSignedIn, readJsonBody, refuseCrossOrigin } from "@/lib/bff"
import { revalidateStore } from "@/lib/revalidate"

type Context = RouteContext<"/api/stores/[slug]/products/[productId]/options">

export async function PUT(request: NextRequest, context: Context): Promise<NextResponse> {
  const refused = refuseCrossOrigin(request)
  if (refused) return refused

  const { slug, productId } = await context.params
  const { status, payload } = await forwardSignedIn(request, {
    path: `/stores/${slug}/products/${productId}/options`,
    method: "PUT",
    body: (await readJsonBody(request)) ?? {},
  })

  if (status === 200) revalidateStore(slug)

  return NextResponse.json(payload, { status })
}
