// Next
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// App
import { forwardSignedIn, readJsonBody, refuseCrossOrigin } from "@/lib/bff"
import { revalidateOffers } from "@/lib/revalidate"

/** The shop's first-purchase pop-up as its owner configures it (BEELINK-306), with what it announces now. */
export async function GET(request: NextRequest, context: RouteContext<"/api/stores/[slug]/popup">): Promise<NextResponse> {
  const refused = refuseCrossOrigin(request)
  if (refused) return refused

  const { slug } = await context.params
  const { status, payload } = await forwardSignedIn(request, { path: `/stores/${slug}/popup`, method: "GET" })
  return NextResponse.json(payload, { status })
}

/**
 * The pop-up saved, whole. The body goes as it came: the API refuses a field out of its bounds, a
 * discount typed by hand and a benefit the pop-up may not name. The shop window is served the
 * pop-up inside its offers, which it keeps: a 2xx drops that answer (`revalidateOffers`) — it
 * alone, since a pop-up is in no catalogue.
 */
export async function PUT(request: NextRequest, context: RouteContext<"/api/stores/[slug]/popup">): Promise<NextResponse> {
  const refused = refuseCrossOrigin(request)
  if (refused) return refused

  const { slug } = await context.params
  const { status, payload } = await forwardSignedIn(request, { path: `/stores/${slug}/popup`, method: "PUT", body: (await readJsonBody(request)) ?? {} })
  if (status >= 200 && status < 300) revalidateOffers(slug)
  return NextResponse.json(payload, { status })
}
