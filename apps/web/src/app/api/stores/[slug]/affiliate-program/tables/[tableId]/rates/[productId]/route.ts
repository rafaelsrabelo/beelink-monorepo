// Next
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// App
import { forwardSignedIn, readJsonBody, refuseCrossOrigin } from "@/lib/bff"

type Context = RouteContext<"/api/stores/[slug]/affiliate-program/tables/[tableId]/rates/[productId]">

async function pathOf(context: Context): Promise<string> {
  const { slug, tableId, productId } = await context.params
  return `/stores/${slug}/affiliate-program/tables/${encodeURIComponent(tableId)}/rates/${encodeURIComponent(productId)}`
}

/** A product's own rate on a table (IMPULSEIA-102). */
export async function PUT(request: NextRequest, context: Context): Promise<NextResponse> {
  const refused = refuseCrossOrigin(request)
  if (refused) return refused

  const { status, payload } = await forwardSignedIn(request, { path: await pathOf(context), method: "PUT", body: (await readJsonBody(request)) ?? {} })
  return NextResponse.json(payload, { status })
}

/** Back to the table's rate. The API answers 204 with no body: so does this. */
export async function DELETE(request: NextRequest, context: Context): Promise<NextResponse> {
  const refused = refuseCrossOrigin(request)
  if (refused) return refused

  const { status, payload } = await forwardSignedIn(request, { path: await pathOf(context), method: "DELETE" })
  return status === 204 ? new NextResponse(null, { status }) : NextResponse.json(payload, { status })
}
