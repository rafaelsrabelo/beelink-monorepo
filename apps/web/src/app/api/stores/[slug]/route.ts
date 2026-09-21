// Next
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// App
import { forwardSignedIn, readJsonBody, refuseCrossOrigin } from "@/lib/bff"
import { revalidateStore } from "@/lib/revalidate"

/** One shop as its owner sees it. `StoresService.assertOwnership` decides whether they may. */
export async function GET(
  request: NextRequest,
  context: RouteContext<"/api/stores/[slug]">,
): Promise<NextResponse> {
  const refused = refuseCrossOrigin(request)
  if (refused) return refused

  const { slug } = await context.params
  const { status, payload } = await forwardSignedIn(request, {
    path: `/stores/${encodeURIComponent(slug)}`,
    method: "GET",
  })

  return NextResponse.json(payload, { status })
}

/**
 * The panel's one save. PUT and not PATCH: the form posts every field it owns, so a key it leaves
 * out is a field the shopkeeper cleared. `slug`, `latitude` and `longitude` are not among them —
 * the slug cannot change and the coordinates are the API's to compute.
 */
export async function PUT(
  request: NextRequest,
  context: RouteContext<"/api/stores/[slug]">,
): Promise<NextResponse> {
  const refused = refuseCrossOrigin(request)
  if (refused) return refused

  const { slug } = await context.params
  const { status, payload } = await forwardSignedIn(request, {
    path: `/stores/${encodeURIComponent(slug)}`,
    method: "PUT",
    body: (await readJsonBody(request)) ?? {},
  })

  // The colours, the name and the banner are what /<slug> renders. Without this the shop window
  // keeps serving the old ones until its revalidate window closes.
  if (status === 200) revalidateStore(slug)

  return NextResponse.json(payload, { status })
}
