// Next
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// App
import { forwardSignedIn, readJsonBody, refuseCrossOrigin } from "@/lib/bff"

type Context = RouteContext<"/api/stores/[slug]/leads/[leadId]">

/**
 * One lead: moved along, or forgotten.
 *
 * Neither calls `revalidateStore`, which apps/web/AGENTS.md asks of admin writes: that rule exists
 * so the cached shop window follows its catalogue, and a lead is not on the shop window.
 */
export async function PATCH(request: NextRequest, context: Context): Promise<NextResponse> {
  const refused = refuseCrossOrigin(request)
  if (refused) return refused

  const { slug, leadId } = await context.params
  const { status, payload } = await forwardSignedIn(request, {
    path: `/stores/${slug}/leads/${leadId}`,
    method: "PATCH",
    body: (await readJsonBody(request)) ?? {},
  })

  return NextResponse.json(payload, { status })
}

export async function DELETE(request: NextRequest, context: Context): Promise<NextResponse> {
  const refused = refuseCrossOrigin(request)
  if (refused) return refused

  const { slug, leadId } = await context.params
  const { status, payload } = await forwardSignedIn(request, {
    path: `/stores/${slug}/leads/${leadId}`,
    method: "DELETE",
  })

  if (status === 204) return new NextResponse(null, { status: 204 })

  return NextResponse.json(payload, { status })
}
