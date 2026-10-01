// Next
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// App
import { forwardSignedIn, readJsonBody, refuseCrossOrigin } from "@/lib/bff"
import { revalidateStore } from "@/lib/revalidate"

/** A page of the shop's promotions, by status. The query string goes whole: the API refuses what it does not declare. */
export async function GET(request: NextRequest, context: RouteContext<"/api/stores/[slug]/promotions">): Promise<NextResponse> {
  const refused = refuseCrossOrigin(request)
  if (refused) return refused

  const { slug } = await context.params
  const { status, payload } = await forwardSignedIn(request, { path: `/stores/${slug}/promotions${request.nextUrl.search}`, method: "GET" })
  return NextResponse.json(payload, { status })
}

/**
 * A promotion created. It changes what the shop window charges — and, once the window shows
 * promotional prices, what it serves — so a 2xx drops the shop's cache (`revalidateStore`).
 */
export async function POST(request: NextRequest, context: RouteContext<"/api/stores/[slug]/promotions">): Promise<NextResponse> {
  const refused = refuseCrossOrigin(request)
  if (refused) return refused

  const { slug } = await context.params
  const { status, payload } = await forwardSignedIn(request, { path: `/stores/${slug}/promotions`, method: "POST", body: (await readJsonBody(request)) ?? {} })
  if (status >= 200 && status < 300) revalidateStore(slug)
  return NextResponse.json(payload, { status })
}
