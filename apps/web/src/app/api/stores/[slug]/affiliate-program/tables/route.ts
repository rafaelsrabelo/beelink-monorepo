// Next
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// App
import { forwardSignedIn, readJsonBody, refuseCrossOrigin } from "@/lib/bff"

/** A new commission table (IMPULSEIA-102). The list is the programme's own read. */
export async function POST(request: NextRequest, context: RouteContext<"/api/stores/[slug]/affiliate-program/tables">): Promise<NextResponse> {
  const refused = refuseCrossOrigin(request)
  if (refused) return refused

  const { slug } = await context.params
  const { status, payload } = await forwardSignedIn(request, { path: `/stores/${slug}/affiliate-program/tables`, method: "POST", body: (await readJsonBody(request)) ?? {} })
  return NextResponse.json(payload, { status })
}
