// Next
import type { NextRequest, NextResponse } from "next/server"

// App
import { forwardToApi } from "@/lib/bff"

/**
 * A visitor sends a site's contact form.
 *
 * Anonymous, like the search beside it: no token travels. What this handler adds is the two
 * things the API's guard needs from here — the origin and content-type check that stops another
 * site posting to it, and the visitor's address, which the per-IP limit is keyed on.
 *
 * No `revalidateStore`: a lead is not on the shop window, so there is nothing cached to drop.
 */
export async function POST(request: NextRequest, context: RouteContext<"/api/storefront/[slug]/contact">): Promise<NextResponse> {
  const { slug } = await context.params

  return forwardToApi(request, `/stores/${encodeURIComponent(slug)}/contact`)
}
