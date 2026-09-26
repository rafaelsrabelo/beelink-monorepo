// Next
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// App
import { forwardSignedIn, readJsonBody, refuseCrossOrigin } from "@/lib/bff"

/** One of the shop's customers: their record, and the customer a new order is opened for. */
export async function GET(request: NextRequest, context: RouteContext<"/api/stores/[slug]/customers/[customerId]">): Promise<NextResponse> {
  const refused = refuseCrossOrigin(request)
  if (refused) return refused

  const { slug, customerId } = await context.params
  const { status, payload } = await forwardSignedIn(request, {
    path: `/stores/${slug}/customers/${encodeURIComponent(customerId)}`,
    method: "GET",
  })

  return NextResponse.json(payload, { status })
}

/**
 * The shopkeeper's correction of a customer's record. The body goes whole: the API refuses a field
 * it does not take — the account's e-mail among them — and a phone another customer has comes back
 * as its 409, which the record turns into a sentence at the phone field.
 */
export async function PATCH(request: NextRequest, context: RouteContext<"/api/stores/[slug]/customers/[customerId]">): Promise<NextResponse> {
  const refused = refuseCrossOrigin(request)
  if (refused) return refused

  const { slug, customerId } = await context.params
  const { status, payload } = await forwardSignedIn(request, {
    path: `/stores/${slug}/customers/${encodeURIComponent(customerId)}`,
    method: "PATCH",
    body: (await readJsonBody(request)) ?? {},
  })

  return NextResponse.json(payload, { status })
}
