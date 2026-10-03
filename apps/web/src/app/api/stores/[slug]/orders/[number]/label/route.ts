// Next
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// App
import { forwardSignedIn, readJsonBody, refuseCrossOrigin } from "@/lib/bff"

type Context = RouteContext<"/api/stores/[slug]/orders/[number]/label">

const pathOf = (slug: string, number: string) => `/stores/${encodeURIComponent(slug)}/orders/${encodeURIComponent(number)}/label`

/** The order's shipping label (BEELINK-187), what buying one needs, the wallet and the box Melhor Envio would pack it in. */
export async function GET(request: NextRequest, context: Context): Promise<NextResponse> {
  const refused = refuseCrossOrigin(request)
  if (refused) return refused

  const { slug, number } = await context.params
  const { status, payload } = await forwardSignedIn(request, { path: pathOf(slug, number), method: "GET" })
  return NextResponse.json(payload, { status })
}

/** Buys the label from the shop's wallet, or carries on buying it; the body goes as it came. */
export async function POST(request: NextRequest, context: Context): Promise<NextResponse> {
  const refused = refuseCrossOrigin(request)
  if (refused) return refused

  const { slug, number } = await context.params
  const { status, payload } = await forwardSignedIn(request, { path: pathOf(slug, number), method: "POST", body: (await readJsonBody(request)) ?? {} })
  return NextResponse.json(payload, { status })
}

/** Cancels the label while Melhor Envio allows it, or takes it out of the cart. */
export async function DELETE(request: NextRequest, context: Context): Promise<NextResponse> {
  const refused = refuseCrossOrigin(request)
  if (refused) return refused

  const { slug, number } = await context.params
  const { status, payload } = await forwardSignedIn(request, { path: pathOf(slug, number), method: "DELETE" })
  return NextResponse.json(payload, { status })
}
