// Next
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// App
import { forwardSignedIn, readJsonBody, refuseCrossOrigin } from "@/lib/bff"

const pathOf = (slug: string) => `/stores/${encodeURIComponent(slug)}/subscription`

/**
 * Where the page stands with bee-link (BEELINK-219) — its trial, its plan, its paid period, the
 * invoice waiting to be paid — and whether this deployment charges at all. Read from the bee-link API
 * alone, which asks Asaas nothing for it.
 *
 * A page that stops paying stops being served (BEELINK-223), and neither this nor the choice below
 * moves that: a choice never changes where the page stands. The check does, when it reads a payment,
 * and it is the one that drops the shop window's cache (`./check/route.ts`).
 */
export async function GET(request: NextRequest, context: RouteContext<"/api/stores/[slug]/subscription">): Promise<NextResponse> {
  const refused = refuseCrossOrigin(request)
  if (refused) return refused

  const { slug } = await context.params
  const { status, payload } = await forwardSignedIn(request, { path: pathOf(slug), method: "GET" })
  return NextResponse.json(payload, { status })
}

/**
 * The cycle the page's plan is paid in (BEELINK-292): `{ cycle }` goes as it came, and the answer is
 * the subscription made at bee-link's Asaas account with the invoice of its first charge. The amount
 * is the API's to read from the plan, never the body's. Limited per address by the API.
 */
export async function PUT(request: NextRequest, context: RouteContext<"/api/stores/[slug]/subscription">): Promise<NextResponse> {
  const refused = refuseCrossOrigin(request)
  if (refused) return refused

  const { slug } = await context.params
  const { status, payload } = await forwardSignedIn(request, { path: pathOf(slug), method: "PUT", body: (await readJsonBody(request)) ?? {} })
  return NextResponse.json(payload, { status })
}
