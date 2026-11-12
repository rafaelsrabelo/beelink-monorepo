// Next
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// App
import { forwardSignedIn, readJsonBody, refuseCrossOrigin } from "@/lib/bff"

type Context = RouteContext<"/api/stores/[slug]/affiliates/[affiliateId]">

async function pathOf(context: Context): Promise<string> {
  const { slug, affiliateId } = await context.params
  return `/stores/${slug}/affiliates/${encodeURIComponent(affiliateId)}`
}

/** One affiliate, whole (IMPULSEIA-104). */
export async function GET(request: NextRequest, context: Context): Promise<NextResponse> {
  const refused = refuseCrossOrigin(request)
  if (refused) return refused

  const { status, payload } = await forwardSignedIn(request, { path: await pathOf(context), method: "GET" })
  return NextResponse.json(payload, { status })
}

/** The affiliate's table and the shop's note: a key left out is left alone. */
export async function PATCH(request: NextRequest, context: Context): Promise<NextResponse> {
  const refused = refuseCrossOrigin(request)
  if (refused) return refused

  const { status, payload } = await forwardSignedIn(request, { path: await pathOf(context), method: "PATCH", body: (await readJsonBody(request)) ?? {} })
  return NextResponse.json(payload, { status })
}

/** An invite nobody accepted, cancelled. The API answers 204 with no body: so does this. */
export async function DELETE(request: NextRequest, context: Context): Promise<NextResponse> {
  const refused = refuseCrossOrigin(request)
  if (refused) return refused

  const { status, payload } = await forwardSignedIn(request, { path: await pathOf(context), method: "DELETE" })
  return status === 204 ? new NextResponse(null, { status }) : NextResponse.json(payload, { status })
}
