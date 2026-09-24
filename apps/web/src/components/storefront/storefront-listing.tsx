// Types
import type { StorefrontCatalog } from "@harness-monorepo/contracts"

// UI
import { StorefrontCatalog as StorefrontCatalogGrid } from "@harness-monorepo/ui/blocks/storefront/storefront-catalog"
import { StorefrontPagination } from "@harness-monorepo/ui/blocks/storefront/storefront-pagination"
import { StorefrontSearch } from "@harness-monorepo/ui/blocks/storefront/storefront-search"

// App
import { StorefrontSectionHeading } from "./storefront-section-heading"
import { pageCountOf } from "@/lib/storefront-data"
import { pageHrefOf, subtitleOf, type SectionPlace } from "@/lib/storefront-section"
import type { StorefrontRoutes } from "@/lib/storefront-routes"

export interface StorefrontListingProps {
  place: SectionPlace
  routes: StorefrontRoutes
  /**
   * The shelf, still on its way. The page starts the request and this awaits it under a Suspense
   * boundary, so the shop's header and menu are on screen while the products are not — and the
   * request stays in the page, the one lane a Server Component reads the catalogue through.
   */
  catalogue: Promise<StorefrontCatalog>
  locale: string
}

/**
 * A shelf of products — the catalogue, a category, a search — composed from the blocks that draw
 * it: the heading, the grid and the pager. The page only resolves where it is and delegates here.
 */
export async function StorefrontListing({ place, routes, catalogue: pending, locale }: StorefrontListingProps) {
  const catalogue = await pending
  const { section, store, messages: ui, page, term } = place
  const layout = store.layoutSettings

  return (
    <>
      <StorefrontSectionHeading place={place} routes={routes} subtitle={subtitleOf(place, catalogue, locale)} />

      <div className="flex flex-col gap-6">
        {/*
          The search page carries the field again, and this is the one place it may take the caret:
          someone who landed here came to type. The header's copy never does.
        */}
        {section.kind === "search" ? <StorefrontSearch action={routes.search()} value={term} autoFocus messages={ui} /> : null}

        <StorefrontCatalogGrid
          products={catalogue.products}
          productHref={routes.product}
          clearHref={section.kind === "catalog" ? undefined : routes.catalog()}
          locale={locale}
          productsPerRow={layout.productsPerRow ?? 3}
          showPrice={layout.showProductPrice ?? true}
          showBadge={layout.showProductBadges ?? true}
          messages={ui}
        >
          <StorefrontPagination
            page={page}
            pageCount={pageCountOf(catalogue.total, catalogue.pageSize)}
            href={pageHrefOf(place, routes)}
            messages={ui}
          />
        </StorefrontCatalogGrid>
      </div>
    </>
  )
}
