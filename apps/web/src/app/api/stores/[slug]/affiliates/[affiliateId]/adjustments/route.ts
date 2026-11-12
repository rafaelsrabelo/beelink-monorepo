// Next
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// App
import { forwardSignedIn, readJsonBody, refuseCrossOrigin } from "@/lib/bff"

/** The shop's correction of what it owes, either way, with its reason (IMPULSEIA-107). The answer is the statement's first page. */
export async function POST(request: NextRequest, context: RouteContext<"/api/stores/[slug]/affiliates/[affiliateId]/adjustments">): Promise<NextResponse> {
  const refused = refuseCrossOrigin(request)
  if (refused) return refused

  const { slug, affiliateId } = await context.params
  const { status, payload } = await forwardSignedIn(request, { path: `/stores/${slug}/affiliates/${encodeURIComponent(affiliateId)}/adjustments`, method: "POST", body: (await readJsonBody(request)) ?? {} })
  return NextResponse.json(payload, { status })
}
