// Next
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// Types
import type { ApiErrorBody } from "@harness-monorepo/contracts"

// App
import { refuseForeignOrigin } from "@/lib/bff"
import { catalogueAt } from "@/lib/storefront-data"
import { LISTING_PAGE_SIZE } from "@/lib/storefront-section"
import { listingPageAskOf, type ListingPage } from "@/lib/listing-pages"

/**
 * The next page of a shelf, for the listing that loads as the visitor scrolls.
 *
 * The browser asks this handler and this handler asks the API, through the same cached read the page
 * itself renders with (`catalogueAt`, under the catalogue's tag), so a page scrolled into answers the
 * same products the address `?pagina=N` would. It answers the products and the count, never the
 * facets and categories the page already drew.
 *
 * `refuseForeignOrigin`, for the reason the search's handler gives: a GET carries no content-type.
 */
export async function GET(
  request: NextRequest,
  context: RouteContext<"/api/storefront/[slug]/catalog">,
): Promise<NextResponse> {
  const refused = refuseForeignOrigin(request)
  if (refused) return refused

  const ask = listingPageAskOf(request.nextUrl.searchParams, LISTING_PAGE_SIZE)
  if (!ask) {
    return NextResponse.json(
      { statusCode: 400, errorCode: "BAD_REQUEST", message: "Expected a page, as a whole number" } satisfies ApiErrorBody,
      { status: 400 },
    )
  }

  const { slug } = await context.params
  const listing = await catalogueAt(slug, ask)

  // An outage, so the listing offers to try again rather than reading the end of the listing.
  if (listing.failed) {
    return NextResponse.json(
      { statusCode: 502, errorCode: "BAD_GATEWAY", message: "The catalogue did not answer" } satisfies ApiErrorBody,
      { status: 502 },
    )
  }

  const page: ListingPage = { products: listing.products, page: listing.page, pageSize: listing.pageSize, total: listing.total }
  return NextResponse.json(page, { status: 200 })
}
