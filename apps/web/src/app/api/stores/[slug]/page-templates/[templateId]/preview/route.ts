// Next
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// Types
import type { TemplatePreviewQuery } from "@harness-monorepo/contracts"

// App
import { forwardSignedIn, refuseCrossOrigin } from "@/lib/bff"

/** What the API reads from the query, and nothing else is passed on. */
const FORWARDED = ["pageId", "productId", "categoryId"] as const satisfies readonly (keyof TemplatePreviewQuery)[]

/**
 * A model as it would look on a page, drawn from the shop's own products. A read: the API writes
 * nothing for it, so no cache is dropped.
 *
 * An empty value is left out rather than forwarded: the API refuses `?productId=` as an id that is
 * none, where a model that asks for a product and got none should answer that it needs one.
 */
export async function GET(
  request: NextRequest,
  context: RouteContext<"/api/stores/[slug]/page-templates/[templateId]/preview">,
): Promise<NextResponse> {
  const refused = refuseCrossOrigin(request)
  if (refused) return refused

  const { slug, templateId } = await context.params
  const query = new URLSearchParams()
  for (const key of FORWARDED) {
    const value = request.nextUrl.searchParams.get(key)
    if (value) query.set(key, value)
  }
  const suffix = query.size ? `?${query.toString()}` : ""

  const { status, payload } = await forwardSignedIn(request, {
    path: `/stores/${encodeURIComponent(slug)}/page-templates/${encodeURIComponent(templateId)}/preview${suffix}`,
    method: "GET",
  })

  return NextResponse.json(payload, { status })
}
