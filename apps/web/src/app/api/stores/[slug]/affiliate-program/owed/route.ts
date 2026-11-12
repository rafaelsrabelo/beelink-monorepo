// Next
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// App
import { forwardSignedIn, refuseCrossOrigin } from "@/lib/bff"

/** What the shop owes its affiliates, by due day (IMPULSEIA-107). */
export async function GET(request: NextRequest, context: RouteContext<"/api/stores/[slug]/affiliate-program/owed">): Promise<NextResponse> {
  const refused = refuseCrossOrigin(request)
  if (refused) return refused

  const { slug } = await context.params
  const { status, payload } = await forwardSignedIn(request, { path: `/stores/${slug}/affiliate-program/owed`, method: "GET" })
  return NextResponse.json(payload, { status })
}
