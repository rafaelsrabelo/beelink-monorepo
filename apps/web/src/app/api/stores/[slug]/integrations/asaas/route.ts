// Next
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// App
import { forwardSignedIn, readJsonBody, refuseCrossOrigin } from "@/lib/bff"

const pathOf = (slug: string) => `/stores/${encodeURIComponent(slug)}/integrations/asaas`

/** The shop's Asaas connection (BEELINK-202): whose account, and the webhook's state — never the key. */
export async function GET(request: NextRequest, context: RouteContext<"/api/stores/[slug]/integrations/asaas">): Promise<NextResponse> {
  const refused = refuseCrossOrigin(request)
  if (refused) return refused

  const { slug } = await context.params
  const { status, payload } = await forwardSignedIn(request, { path: pathOf(slug), method: "GET" })
  return NextResponse.json(payload, { status })
}

/**
 * Connect with the API key the shopkeeper pasted, or replace the one connected. The body goes as it
 * came: the API checks the key with Asaas and seals it, and nothing here keeps or logs it.
 */
export async function POST(request: NextRequest, context: RouteContext<"/api/stores/[slug]/integrations/asaas">): Promise<NextResponse> {
  const refused = refuseCrossOrigin(request)
  if (refused) return refused

  const { slug } = await context.params
  const { status, payload } = await forwardSignedIn(request, { path: pathOf(slug), method: "POST", body: (await readJsonBody(request)) ?? {} })
  return NextResponse.json(payload, { status })
}

/** Disconnect: the API removes the webhook and deletes the key. Its 204 becomes a 200 with an empty body, as every delete here. */
export async function DELETE(request: NextRequest, context: RouteContext<"/api/stores/[slug]/integrations/asaas">): Promise<NextResponse> {
  const refused = refuseCrossOrigin(request)
  if (refused) return refused

  const { slug } = await context.params
  const { status, payload } = await forwardSignedIn(request, { path: pathOf(slug), method: "DELETE" })
  return NextResponse.json(status === 204 ? {} : payload, { status: status === 204 ? 200 : status })
}
