// Next
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// App
import { forwardSignedIn, refuseCrossOrigin } from "@/lib/bff"

/**
 * The platform's taxonomy, for the select on the panel's identity tab. It sits beside `stores`
 * rather than under it on purpose: `/api/stores/<slug>` is keyed by a slug a shopkeeper chooses,
 * and a shop that claimed `categories` would otherwise shadow this handler.
 *
 * Signed in, because the API keeps it signed in: the only consumer in this phase is the panel.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const refused = refuseCrossOrigin(request)
  if (refused) return refused

  const { status, payload } = await forwardSignedIn(request, {
    path: "/store-categories",
    method: "GET",
  })

  return NextResponse.json(payload, { status })
}
