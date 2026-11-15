// Next
import type { NextRequest, NextResponse } from "next/server"

// App
import { forwardToApi } from "@/lib/bff"

/**
 * A visitor applies to be the shop's affiliate (plan 2026-11-14). Anonymous, like the restock notice:
 * no token travels, and the visitor's address goes with the request because the API's limit is kept
 * per address. No `revalidateStore`: an application is not on the shop window.
 */
export async function POST(request: NextRequest, context: RouteContext<"/api/storefront/[slug]/affiliate-applications">): Promise<NextResponse> {
  const { slug } = await context.params

  return forwardToApi(request, `/stores/${encodeURIComponent(slug)}/affiliate-join/applications`)
}
