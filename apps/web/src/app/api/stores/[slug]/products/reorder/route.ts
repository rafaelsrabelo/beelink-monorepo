// Next
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// App
import { forwardSignedIn, readJsonBody, refuseCrossOrigin } from "@/lib/bff"
import { revalidateStore } from "@/lib/revalidate"

/** The whole list, in its new order — the order the shop window shows them in. */
export async function PUT(
  request: NextRequest,
  context: RouteContext<"/api/stores/[slug]/products/reorder">,
): Promise<NextResponse> {
  const refused = refuseCrossOrigin(request)
  if (refused) return refused

  const { slug } = await context.params
  const { status, payload } = await forwardSignedIn(request, {
    path: `/stores/${encodeURIComponent(slug)}/products/reorder`,
    method: "PUT",
    body: (await readJsonBody(request)) ?? {},
  })

  if (status === 200) revalidateStore(slug)

  return NextResponse.json(payload, { status })
}
