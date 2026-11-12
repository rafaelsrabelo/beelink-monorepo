// Next
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// App
import { forwardSignedIn, readJsonBody, refuseCrossOrigin } from "@/lib/bff"

type Context = RouteContext<"/api/stores/[slug]/affiliate-program/tables/[tableId]">

async function pathOf(context: Context): Promise<string> {
  const { slug, tableId } = await context.params
  return `/stores/${slug}/affiliate-program/tables/${encodeURIComponent(tableId)}`
}

/** A commission table with its rates by product (IMPULSEIA-102). */
export async function GET(request: NextRequest, context: Context): Promise<NextResponse> {
  const refused = refuseCrossOrigin(request)
  if (refused) return refused

  const { status, payload } = await forwardSignedIn(request, { path: await pathOf(context), method: "GET" })
  return NextResponse.json(payload, { status })
}

export async function PUT(request: NextRequest, context: Context): Promise<NextResponse> {
  const refused = refuseCrossOrigin(request)
  if (refused) return refused

  const { status, payload } = await forwardSignedIn(request, { path: await pathOf(context), method: "PUT", body: (await readJsonBody(request)) ?? {} })
  return NextResponse.json(payload, { status })
}

/** Deleted, the API answers 204 with no body: so does this. */
export async function DELETE(request: NextRequest, context: Context): Promise<NextResponse> {
  const refused = refuseCrossOrigin(request)
  if (refused) return refused

  const { status, payload } = await forwardSignedIn(request, { path: await pathOf(context), method: "DELETE" })
  return status === 204 ? new NextResponse(null, { status }) : NextResponse.json(payload, { status })
}
