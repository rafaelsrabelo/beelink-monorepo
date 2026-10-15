// Next
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// App
import { forwardSignedIn, refuseCrossOrigin } from "@/lib/bff"

/**
 * What a page costs (BEELINK-219): the plans on sale, each with what its cycles cost, for the panel's
 * Assinar screen (BEELINK-293), which writes no amount of its own. The API answers it to anyone;
 * here it is signed in, beside `/api/store-categories` and for the same reason — the panel is its one
 * reader, and opening a route later is one line while closing one breaks a caller. The landing keeps
 * its own copy of the prices (`lib/plans.ts`) and never comes here.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const refused = refuseCrossOrigin(request)
  if (refused) return refused

  const { status, payload } = await forwardSignedIn(request, { path: "/billing/plans", method: "GET" })
  return NextResponse.json(payload, { status })
}
