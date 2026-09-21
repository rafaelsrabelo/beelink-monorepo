// Next
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// App
import { forwardSignedIn, refuseCrossOrigin } from "@/lib/bff"

/**
 * The named palettes the appearance tab applies in one click. They are read from the API for a
 * structural reason, not a stylistic one: a preset is four `#RRGGBB` values, and `web/no-hex-colors`
 * scans both `apps/web/src` and `packages/ui/src`. A palette is shop data exactly like a shop's own
 * colours, so it lives where shop data lives — the database — and travels as data.
 *
 * Signed in, beside `/api/store-categories` and for the same reason: the only consumer today is
 * the panel, and opening a route later is one line while closing one is a breaking change.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const refused = refuseCrossOrigin(request)
  if (refused) return refused

  const { status, payload } = await forwardSignedIn(request, {
    path: "/store-color-presets",
    method: "GET",
  })

  return NextResponse.json(payload, { status })
}
