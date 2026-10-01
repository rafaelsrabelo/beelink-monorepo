// Next
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// App
import { forwardSignedIn, readJsonBody, refuseCrossOrigin } from "@/lib/bff"

/**
 * What a sale would cost before it is registered (BEELINK-194): the lines at the catalogue's price,
 * what the promotions of that day take off them, and the total the API would write. The body goes
 * whole, as the order's does: the API validates it and prices every line itself.
 */
export async function POST(request: NextRequest, context: RouteContext<"/api/stores/[slug]/orders/quote">): Promise<NextResponse> {
  const refused = refuseCrossOrigin(request)
  if (refused) return refused

  const { slug } = await context.params
  const { status, payload } = await forwardSignedIn(request, {
    path: `/stores/${slug}/orders/quote`,
    method: "POST",
    body: (await readJsonBody(request)) ?? {},
  })

  return NextResponse.json(payload, { status })
}
