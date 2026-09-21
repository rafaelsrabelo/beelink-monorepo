// Next
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// App
import { forwardSignedIn, refuseCrossOrigin } from "@/lib/bff"

/**
 * The address box behind the panel's street field.
 *
 * It forwards rather than calling a provider itself, and that is the point: the search is billable
 * and only the API can tell whether the caller is really signed in. A handler that stopped here,
 * checking that a cookie was present, would be a free geocoder spending this product's quota —
 * which is exactly the hole `/api/uploads` had.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const refused = refuseCrossOrigin(request)
  if (refused) return refused

  const query = request.nextUrl.searchParams.get("q") ?? ""

  const { status, payload } = await forwardSignedIn(request, {
    path: `/addresses/search?q=${encodeURIComponent(query)}`,
    method: "GET",
  })

  return NextResponse.json(payload, { status })
}
