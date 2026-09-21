// Next
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// Types
import type { StorefrontCatalog } from "@harness-monorepo/contracts"

// App
import { refuseForeignOrigin } from "@/lib/bff"
import { catalogueAt } from "@/lib/storefront-data"

/**
 * What the shop's search box shows while someone is still typing.
 *
 * The browser never reaches the API: it asks this handler, which asks the API server-side, exactly
 * as every other read in this app does. The storefront is anonymous, so no token travels either
 * way — what this protects is the shape of the system, not a secret. `API_URL` stays server-only.
 *
 * It answers a handful of products and nothing else. The suggestions list is a shortcut into the
 * catalogue and not a second catalogue: someone who wants the whole result presses Enter and gets
 * the search page, which is a real address, crawlable, and works with no JavaScript at all. That
 * page is the feature; this is the convenience on top of it.
 */
const SUGGESTIONS = 6

export async function GET(
  request: NextRequest,
  context: RouteContext<"/api/storefront/[slug]/search">,
): Promise<NextResponse> {
  // `refuseForeignOrigin` and not `refuseCrossOrigin`: the stricter one also demands a JSON
  // content-type, which is how a handler that takes a body tells a real request from a form a
  // hostile page posted. A GET has no body and no content-type, so that check refuses everything,
  // including the browser's own. What is left is the origin, which is the part that applies.
  const refused = refuseForeignOrigin(request)
  if (refused) return refused

  const { slug } = await context.params
  const term = request.nextUrl.searchParams.get("q")?.trim() ?? ""

  // An empty box is an empty list, not a page of the whole shop: the catalogue endpoint ignores a
  // blank filter, so asking it would answer with everything the shop sells under the search field.
  if (!term) return NextResponse.json({ products: [] }, { status: 200 })

  const catalogue: StorefrontCatalog = await catalogueAt(slug, { search: term, pageSize: SUGGESTIONS })

  return NextResponse.json({ products: catalogue.products, total: catalogue.total }, { status: 200 })
}
