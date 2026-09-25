// Next
import type { NextRequest, NextResponse } from "next/server"

// App
import { forwardToApi } from "@/lib/bff"

/**
 * A visitor asks to be told when a sold-out combination is back.
 *
 * Anonymous, like the contact form beside it: no token travels, and the visitor's address goes
 * with the request because the API's limit is kept per address. No `revalidateStore`: a request
 * is not on the shop window.
 */
export async function POST(
  request: NextRequest,
  context: RouteContext<"/api/storefront/[slug]/products/[productId]/restock-requests">,
): Promise<NextResponse> {
  const { slug, productId } = await context.params

  return forwardToApi(
    request,
    `/stores/${encodeURIComponent(slug)}/products/${encodeURIComponent(productId)}/restock-requests`,
  )
}
