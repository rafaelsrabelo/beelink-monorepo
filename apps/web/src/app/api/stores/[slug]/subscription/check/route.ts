// Next
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// App
import { forwardSignedIn, refuseCrossOrigin } from "@/lib/bff"
import { revalidateStore } from "@/lib/revalidate"

/** Whether the answer reads the page paid: the one thing a check learns that a visitor is served differently by. */
function paid(payload: unknown): boolean {
  if (typeof payload !== "object" || payload === null || !("subscription" in payload)) return false
  const { subscription } = payload
  return typeof subscription === "object" && subscription !== null && "status" in subscription && subscription.status === "ACTIVE"
}

/**
 * Whether the page's charge was paid, asked now (BEELINK-221): the API reads Asaas — at most once in
 * ten seconds for a page — and answers the subscription as it then stands. It is what the Assinar
 * screen asks while it waits for a payment, since no webhook reaches a desk. The API limits it per
 * address, and `forwardSignedIn` hands it the shopkeeper's address, not this server's.
 *
 * A page read paid may have been off the air a moment ago, locked for want of payment (BEELINK-223):
 * its shop window is dropped from the cache then, so the shopkeeper who just paid finds it open at
 * once — anything else that opens a page is seen within the minute a locked window is kept. The
 * Assinar screen stops asking once it reads the page paid, so this drops it once a payment.
 */
export async function POST(request: NextRequest, context: RouteContext<"/api/stores/[slug]/subscription/check">): Promise<NextResponse> {
  const refused = refuseCrossOrigin(request)
  if (refused) return refused

  const { slug } = await context.params
  const { status, payload } = await forwardSignedIn(request, { path: `/stores/${encodeURIComponent(slug)}/subscription/check`, method: "POST", body: {} })
  if (status === 200 && paid(payload)) revalidateStore(slug)
  return NextResponse.json(payload, { status })
}
