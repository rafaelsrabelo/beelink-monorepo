"use client"

// UI
import { StorefrontCatalog as StorefrontCatalogGrid } from "@harness-monorepo/ui/blocks/storefront/storefront-catalog"
import { StorefrontLoadMore } from "@harness-monorepo/ui/blocks/storefront/storefront-load-more"
import type { StorefrontProduct } from "@harness-monorepo/ui/blocks/storefront/storefront-product-card"
import type { StorefrontInstallmentTerms } from "@harness-monorepo/ui/lib/installments"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// App
import type { ListingPage } from "@/lib/listing-pages"
import { useListingPages } from "@/services/storefront/storefront-hooks"
import { StorefrontFavoriteLive } from "./favorites/storefront-favorite-live"
import { StorefrontCardCartLive } from "./storefront-card-cart-live"

export interface StorefrontListingGridProps {
  slug: string
  /** The API's query for this shelf, without its page (`catalogueQueryOf`). */
  query: string
  /** The page the server drew, which the list starts from. */
  first: ListingPage
  /** `routes.product("")`: a product's address is this and its slug. */
  productPath: string
  /** Every page's own address, first to last: the next one is the link under the grid. */
  pageHrefs: readonly string[]
  clearHref?: string
  filtered: boolean
  retryHref?: string
  locale: string
  productsPerRow: 2 | 3 | 4
  showPrice: boolean
  installments?: StorefrontInstallmentTerms
  showBadge: boolean
  showRating: boolean
  quickAdd: boolean
  messages: UiMessages
}

/**
 * A shelf that grows as it is scrolled — most of the shop windows' visitors are on a phone, where a
 * row of page numbers at the foot is a target too small for a thumb and a reason to stop.
 *
 * The first page is the server's, in the HTML a crawler reads; the next ones come from the query
 * cache (`useListingPages`), one at a time, as the foot of the grid comes near. A product the shop moved
 * between two pages' reads is drawn once.
 */
export function StorefrontListingGrid({ slug, query, first, productPath, pageHrefs, quickAdd, messages, ...grid }: StorefrontListingGridProps) {
  const listing = useListingPages(slug, query, first)
  const pages = listing.data?.pages ?? [first]
  const seen = new Set<string>()
  const products = pages.flatMap((page) => page.products).filter((product) => !seen.has(product.id) && Boolean(seen.add(product.id)))
  const nextPage = pages[pages.length - 1]!.page + 1
  const nextHref = pageHrefs[nextPage - 1]

  return (
    <StorefrontCatalogGrid
      products={products}
      productHref={(productSlug) => `${productPath}${productSlug}`}
      {...grid}
      {...(quickAdd ? { cardAction: (product: StorefrontProduct) => <StorefrontCardCartLive product={product} messages={messages} /> } : {})}
      cardFavorite={(product: StorefrontProduct) => <StorefrontFavoriteLive productId={product.id} productName={product.name} priceCents={product.priceCents} messages={messages} />}
      messages={messages}
    >
      {listing.hasNextPage && nextHref ? (
        <StorefrontLoadMore
          href={nextHref}
          onLoad={() => void listing.fetchNextPage()}
          pending={listing.isFetchingNextPage}
          failed={listing.isFetchNextPageError}
          productsPerRow={grid.productsPerRow}
          messages={messages}
        />
      ) : null}
    </StorefrontCatalogGrid>
  )
}
