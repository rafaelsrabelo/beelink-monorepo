// Next
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// App
import { forwardSignedIn, refuseCrossOrigin } from "@/lib/bff"
import { revalidateStore } from "@/lib/revalidate"

/**
 * Checks the shop's saved domain again, now (BEELINK-285): its DNS, then https, and the domain as it
 * then stands. A check may turn a pending domain active, and the shop's public data says which it
 * is, so what the shop window kept of it is dropped whenever the check was run. The API limits it
 * per address — it waits on a DNS lookup and a call out — and `forwardSignedIn` hands it the
 * shopkeeper's address, not this server's.
 */
export async function POST(request: NextRequest, context: RouteContext<"/api/stores/[slug]/custom-domain/check">): Promise<NextResponse> {
  const refused = refuseCrossOrigin(request)
  if (refused) return refused

  const { slug } = await context.params
  const { status, payload } = await forwardSignedIn(request, { path: `/stores/${encodeURIComponent(slug)}/custom-domain/check`, method: "POST", body: {} })
  if (status >= 200 && status < 300) revalidateStore(slug)
  return NextResponse.json(payload, { status })
}
