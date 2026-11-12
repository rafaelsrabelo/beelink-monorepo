// Next
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// App
import { forwardSignedIn, readJsonBody, refuseCrossOrigin } from "@/lib/bff"

const pathOf = (slug: string, affiliateId: string) => `/stores/${slug}/affiliates/${encodeURIComponent(affiliateId)}/document`

/** The links to an affiliate's document's photos (12/11/2026), valid ten minutes: never cached on the way. */
export async function GET(request: NextRequest, context: RouteContext<"/api/stores/[slug]/affiliates/[affiliateId]/document">): Promise<NextResponse> {
  const refused = refuseCrossOrigin(request)
  if (refused) return refused

  const { slug, affiliateId } = await context.params
  const { status, payload } = await forwardSignedIn(request, { path: pathOf(slug, affiliateId), method: "GET" })
  return NextResponse.json(payload, { status, headers: { "cache-control": "no-store" } })
}

/** The document sent, or sent again. */
export async function PUT(request: NextRequest, context: RouteContext<"/api/stores/[slug]/affiliates/[affiliateId]/document">): Promise<NextResponse> {
  const refused = refuseCrossOrigin(request)
  if (refused) return refused

  const { slug, affiliateId } = await context.params
  const { status, payload } = await forwardSignedIn(request, { path: pathOf(slug, affiliateId), method: "PUT", body: (await readJsonBody(request)) ?? {} })
  return NextResponse.json(payload, { status })
}
