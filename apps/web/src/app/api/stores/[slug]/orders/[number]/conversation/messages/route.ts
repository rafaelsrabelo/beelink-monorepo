// Next
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// App
import { forwardSignedIn, readJsonBody, refuseCrossOrigin } from "@/lib/bff"

/** The shop's answer on the order's conversation. Only the text goes on; the API decides the rest. */
export async function POST(request: NextRequest, context: RouteContext<"/api/stores/[slug]/orders/[number]/conversation/messages">): Promise<NextResponse> {
  const refused = refuseCrossOrigin(request)
  if (refused) return refused

  const { slug, number } = await context.params
  const sent = await readJsonBody(request)
  const body = typeof sent === "object" && sent !== null && "body" in sent ? sent.body : undefined
  const { status, payload } = await forwardSignedIn(request, { path: `/stores/${slug}/orders/${encodeURIComponent(number)}/conversation/messages`, method: "POST", body: { body } })
  return NextResponse.json(payload, { status })
}
