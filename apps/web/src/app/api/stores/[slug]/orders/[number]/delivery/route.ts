// Next
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// App
import { forwardSignedIn, readJsonBody, refuseCrossOrigin } from "@/lib/bff"

type Context = RouteContext<"/api/stores/[slug]/orders/[number]/delivery">

/** Tells how a delivery goes, replacing what was told. The API refuses a pick-up and a window that does not fit. */
export async function PUT(request: NextRequest, context: Context): Promise<NextResponse> {
  const refused = refuseCrossOrigin(request)
  if (refused) return refused

  const { slug, number } = await context.params
  const { status, payload } = await forwardSignedIn(request, {
    path: `/stores/${slug}/orders/${encodeURIComponent(number)}/delivery`,
    method: "PUT",
    body: (await readJsonBody(request)) ?? {},
  })
  return NextResponse.json(payload, { status })
}

/** Takes back what was told of the delivery. */
export async function DELETE(request: NextRequest, context: Context): Promise<NextResponse> {
  const refused = refuseCrossOrigin(request)
  if (refused) return refused

  const { slug, number } = await context.params
  const { status, payload } = await forwardSignedIn(request, { path: `/stores/${slug}/orders/${encodeURIComponent(number)}/delivery`, method: "DELETE" })
  return NextResponse.json(payload, { status })
}
