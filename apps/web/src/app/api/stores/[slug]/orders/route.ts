// Next
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// App
import { forwardSignedIn, readJsonBody, refuseCrossOrigin } from "@/lib/bff"

/**
 * A shop's orders, as its owner pages, filters and searches through them. The query string is
 * forwarded whole: the API refuses what it does not declare, and a second list here would drift.
 */
export async function GET(request: NextRequest, context: RouteContext<"/api/stores/[slug]/orders">): Promise<NextResponse> {
  const refused = refuseCrossOrigin(request)
  if (refused) return refused

  const { slug } = await context.params
  const { status, payload } = await forwardSignedIn(request, {
    path: `/stores/${slug}/orders${request.nextUrl.search}`,
    method: "GET",
  })

  return NextResponse.json(payload, { status })
}

/**
 * Registers an order the shopkeeper closed elsewhere. The body goes whole: the API validates it and
 * prices every line itself, so nothing here could make a total the API would not.
 */
export async function POST(request: NextRequest, context: RouteContext<"/api/stores/[slug]/orders">): Promise<NextResponse> {
  const refused = refuseCrossOrigin(request)
  if (refused) return refused

  const { slug } = await context.params
  const { status, payload } = await forwardSignedIn(request, {
    path: `/stores/${slug}/orders`,
    method: "POST",
    body: (await readJsonBody(request)) ?? {},
  })

  return NextResponse.json(payload, { status })
}
