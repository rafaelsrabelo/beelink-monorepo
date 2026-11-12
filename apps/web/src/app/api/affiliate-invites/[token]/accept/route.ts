// Next
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// App
import { forwardSignedIn, readJsonBody, refuseCrossOrigin } from "@/lib/bff"

/** Accept, signed in with the bee-link account of the e-mail invited (IMPULSEIA-104). */
export async function POST(request: NextRequest, context: RouteContext<"/api/affiliate-invites/[token]/accept">): Promise<NextResponse> {
  const refused = refuseCrossOrigin(request)
  if (refused) return refused

  const { token } = await context.params
  const { status, payload } = await forwardSignedIn(request, { path: `/affiliate-invites/${encodeURIComponent(token)}/accept`, method: "POST", body: (await readJsonBody(request)) ?? {} })
  return NextResponse.json(payload, { status })
}
