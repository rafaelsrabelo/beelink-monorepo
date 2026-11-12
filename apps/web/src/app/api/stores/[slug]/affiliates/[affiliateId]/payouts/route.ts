// Next
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// App
import { forwardSignedIn, readJsonBody, refuseCrossOrigin } from "@/lib/bff"

/** A payment made outside bee-link, recorded (IMPULSEIA-107): nothing moves here. The answer is the statement's first page. */
export async function POST(request: NextRequest, context: RouteContext<"/api/stores/[slug]/affiliates/[affiliateId]/payouts">): Promise<NextResponse> {
  const refused = refuseCrossOrigin(request)
  if (refused) return refused

  const { slug, affiliateId } = await context.params
  const { status, payload } = await forwardSignedIn(request, { path: `/stores/${slug}/affiliates/${encodeURIComponent(affiliateId)}/payouts`, method: "POST", body: (await readJsonBody(request)) ?? {} })
  return NextResponse.json(payload, { status })
}
