// Next
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// App
import { forwardSignedIn, readJsonBody, refuseCrossOrigin } from "@/lib/bff"
import { revalidateStore } from "@/lib/revalidate"

type Context = RouteContext<"/api/stores/[slug]/affiliate-page">

/** The shop's "Seja afiliado" page as its owner sets and writes it (plan 2026-11-14). */
export async function GET(request: NextRequest, context: Context): Promise<NextResponse> {
  const refused = refuseCrossOrigin(request)
  if (refused) return refused

  const { slug } = await context.params
  const { status, payload } = await forwardSignedIn(request, { path: `/stores/${slug}/affiliate-page`, method: "GET" })
  return NextResponse.json(payload, { status })
}

/**
 * The page saved, whole. Every page of the shop window reads where it leads to it — the banner, the
 * footer's link, the strip — and the page's own texts, so the shop's kept answers go with the save.
 */
export async function PUT(request: NextRequest, context: Context): Promise<NextResponse> {
  const refused = refuseCrossOrigin(request)
  if (refused) return refused

  const { slug } = await context.params
  const { status, payload } = await forwardSignedIn(request, { path: `/stores/${slug}/affiliate-page`, method: "PUT", body: (await readJsonBody(request)) ?? {} })
  if (status >= 200 && status < 300) revalidateStore(slug)
  return NextResponse.json(payload, { status })
}
