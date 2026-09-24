// Types
import type { StorefrontCatalog } from "@harness-monorepo/contracts"

// UI
import { StorefrontCatalog as StorefrontCatalogGrid } from "@harness-monorepo/ui/blocks/storefront/storefront-catalog"
import { StorefrontCategories } from "@harness-monorepo/ui/blocks/storefront/storefront-categories"
import { StorefrontPagination } from "@harness-monorepo/ui/blocks/storefront/storefront-pagination"
import { StorefrontSearch } from "@harness-monorepo/ui/blocks/storefront/storefront-search"

// App
import { pageCountOf } from "@/lib/storefront-data"
import { pageHrefOf, type SectionPlace } from "@/lib/storefront-section"
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
 * it: a category's children, the grid and the pager. The results band above it is the page's.
 */
export async function StorefrontListing({ place, routes, catalogue: pending, locale }: StorefrontListingProps) {
  const catalogue = await pending
  const { section, store, category, navigation, messages: ui, page, term } = place
  const layout = store.layoutSettings

  // Only on a category's own page, and only its own children: the catalogue is every category at
  // once and has the menu for that.
  const subcategories = category ? navigation.categories.filter((entry) => entry.parentSlug === category.slug) : []

  return (
    <div className="flex flex-col gap-6">
      {/*
        The level below this one. The menu draws the first level only — nineteen subheadings in
        one row is not a menu — so a category's own page is where its subcategories are reached.
        "Tudo" here points back at this category: from inside Proteínas, everything is every protein.
      */}
      {category && subcategories.length ? (
        <StorefrontCategories
          categories={subcategories}
          active={null}
          href={(childSlug) => routes.category(childSlug || category.slug)}
          messages={ui}
        />
      ) : null}

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
  )
}
