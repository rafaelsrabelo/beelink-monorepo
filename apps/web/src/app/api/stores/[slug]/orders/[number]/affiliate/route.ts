// Next
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// App
import { forwardSignedIn, readJsonBody, refuseCrossOrigin } from "@/lib/bff"

type Context = RouteContext<"/api/stores/[slug]/orders/[number]/affiliate">

async function pathOf(context: Context): Promise<string> {
  const { slug, number } = await context.params
  return `/stores/${slug}/orders/${encodeURIComponent(number)}/affiliate`
}

/** Whom the order is credited to, its commission and every change of it (IMPULSEIA-107). */
export async function GET(request: NextRequest, context: Context): Promise<NextResponse> {
  const refused = refuseCrossOrigin(request)
  if (refused) return refused

  const { status, payload } = await forwardSignedIn(request, { path: await pathOf(context), method: "GET" })
  return NextResponse.json(payload, { status })
}

/** Credited to another affiliate, or to nobody, and why. Nothing the shop window shows changes. */
export async function PUT(request: NextRequest, context: Context): Promise<NextResponse> {
  const refused = refuseCrossOrigin(request)
  if (refused) return refused

  const { status, payload } = await forwardSignedIn(request, { path: await pathOf(context), method: "PUT", body: (await readJsonBody(request)) ?? {} })
  return NextResponse.json(payload, { status })
}
