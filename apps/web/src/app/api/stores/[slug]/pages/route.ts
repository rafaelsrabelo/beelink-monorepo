// Next
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// App
import { forwardSignedIn, readJsonBody, refuseCrossOrigin } from "@/lib/bff"

/** The shop's pages: its home, then its landings. */
export async function GET(request: NextRequest, context: RouteContext<"/api/stores/[slug]/pages">): Promise<NextResponse> {
  const refused = refuseCrossOrigin(request)
  if (refused) return refused

  const { slug } = await context.params
  const { status, payload } = await forwardSignedIn(request, { path: `/stores/${encodeURIComponent(slug)}/pages`, method: "GET" })

  return NextResponse.json(payload, { status })
}

/**
 * A new landing, as a draft. Nothing is revalidated: a draft is served to nobody, and the shop's
 * menu lists only published pages.
 */
export async function POST(request: NextRequest, context: RouteContext<"/api/stores/[slug]/pages">): Promise<NextResponse> {
  const refused = refuseCrossOrigin(request)
  if (refused) return refused

  const { slug } = await context.params
  const { status, payload } = await forwardSignedIn(request, {
    path: `/stores/${encodeURIComponent(slug)}/pages`,
    method: "POST",
    body: (await readJsonBody(request)) ?? {},
  })

  return NextResponse.json(payload, { status })
}
