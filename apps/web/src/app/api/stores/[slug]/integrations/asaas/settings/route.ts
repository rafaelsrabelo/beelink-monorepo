// Next
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// App
import { forwardSignedIn, readJsonBody, refuseCrossOrigin } from "@/lib/bff"

const pathOf = (slug: string) => `/stores/${encodeURIComponent(slug)}/integrations/asaas/settings`

/** How the shop is paid through Asaas (BEELINK-203): Pix, credit card and its instalments, paying on delivery. */
export async function GET(request: NextRequest, context: RouteContext<"/api/stores/[slug]/integrations/asaas/settings">): Promise<NextResponse> {
  const refused = refuseCrossOrigin(request)
  if (refused) return refused

  const { slug } = await context.params
  const { status, payload } = await forwardSignedIn(request, { path: pathOf(slug), method: "GET" })
  return NextResponse.json(payload, { status })
}

/**
 * Saved whole; the body goes as it came, and the API refuses a choice out of range. Nothing the shop
 * window serves reads these until the checkout offers them (BEELINK-205), so no cache is dropped.
 */
export async function PUT(request: NextRequest, context: RouteContext<"/api/stores/[slug]/integrations/asaas/settings">): Promise<NextResponse> {
  const refused = refuseCrossOrigin(request)
  if (refused) return refused

  const { slug } = await context.params
  const { status, payload } = await forwardSignedIn(request, { path: pathOf(slug), method: "PUT", body: (await readJsonBody(request)) ?? {} })
  return NextResponse.json(payload, { status })
}
