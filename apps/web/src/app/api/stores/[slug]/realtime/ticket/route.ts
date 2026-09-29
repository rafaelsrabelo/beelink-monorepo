// Next
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// App
import { forwardSignedIn, refuseCrossOrigin } from "@/lib/bff"

/**
 * A ticket to the shop's real-time room, for the panel's socket. Asked with the session in the
 * cookies — which never reach the page — and handed to the page: short, single use, worth nothing
 * once the socket took it.
 */
export async function POST(request: NextRequest, context: RouteContext<"/api/stores/[slug]/realtime/ticket">): Promise<NextResponse> {
  const refused = refuseCrossOrigin(request)
  if (refused) return refused

  const { slug } = await context.params
  const { status, payload } = await forwardSignedIn(request, { path: `/stores/${encodeURIComponent(slug)}/realtime/ticket`, method: "POST", body: {} })
  return NextResponse.json(payload, { status })
}
