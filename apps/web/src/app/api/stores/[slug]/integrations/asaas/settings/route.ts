// Next
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// App
import { forwardSignedIn, readJsonBody, refuseCrossOrigin } from "@/lib/bff"
import { revalidateStore } from "@/lib/revalidate"

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
 * Saved whole; the body goes as it came, and the API refuses a choice out of range. The checkout
 * reads these choices (BEELINK-205), so what the shop window kept of them is dropped on a save.
 */
export async function PUT(request: NextRequest, context: RouteContext<"/api/stores/[slug]/integrations/asaas/settings">): Promise<NextResponse> {
  const refused = refuseCrossOrigin(request)
  if (refused) return refused

  const { slug } = await context.params
  const { status, payload } = await forwardSignedIn(request, { path: pathOf(slug), method: "PUT", body: (await readJsonBody(request)) ?? {} })
  if (status >= 200 && status < 300) revalidateStore(slug)
  return NextResponse.json(payload, { status })
}
