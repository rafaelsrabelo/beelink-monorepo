// Types
import type { StorefrontCatalog } from "@harness-monorepo/contracts"

// UI
import { StorefrontCatalog as StorefrontCatalogGrid } from "@harness-monorepo/ui/blocks/storefront/storefront-catalog"
import { StorefrontCategories } from "@harness-monorepo/ui/blocks/storefront/storefront-categories"
import { StorefrontCategoryFilter } from "@harness-monorepo/ui/blocks/storefront/storefront-category-filter"
import { StorefrontDiscountFilter } from "@harness-monorepo/ui/blocks/storefront/storefront-discount-filter"
import { StorefrontFilterChips } from "@harness-monorepo/ui/blocks/storefront/storefront-filter-chips"
import { StorefrontFilterColumn } from "@harness-monorepo/ui/blocks/storefront/storefront-filter-column"
import { StorefrontFilterSheet } from "@harness-monorepo/ui/blocks/storefront/storefront-filter-sheet"
import { StorefrontOptionFilter } from "@harness-monorepo/ui/blocks/storefront/storefront-option-filter"
import { StorefrontPagination } from "@harness-monorepo/ui/blocks/storefront/storefront-pagination"
import type { StorefrontProduct } from "@harness-monorepo/ui/blocks/storefront/storefront-product-card"
import { StorefrontPriceFilter } from "@harness-monorepo/ui/blocks/storefront/storefront-price-filter"
import { StorefrontSearch } from "@harness-monorepo/ui/blocks/storefront/storefront-search"

// App
import { pageCountOf } from "@/lib/storefront-data"
import { StorefrontCardCartLive } from "./storefront-card-cart-live"
import { StorefrontListingControls } from "./storefront-listing-controls"
import { categoryFilterOf, clearFiltersHrefOf, discountFilterOf, filterChipsOf, optionFiltersOf, priceFilterOf } from "@/lib/storefront-filters"
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
 * A shelf of products — the catalogue, a category, a search — as 5a lays it out on the canvas: the
 * filter column beside the grid and the pager. The results band above it is the page's.
 */
export async function StorefrontListing({ place, routes, catalogue: pending, locale }: StorefrontListingProps) {
  const catalogue = await pending
  const { section, store, category, navigation, messages: ui, page, term } = place
  const layout = store.layoutSettings

  // Only on a category's own page, and only its own children: the catalogue is every category at
  // once and has the menu for that.
  const subcategories = category ? navigation.categories.filter((entry) => entry.parentSlug === category.slug) : []
  const price = priceFilterOf(place, catalogue, routes, locale)
  const chips = filterChipsOf(place, routes, locale)

  // One set of groups, drawn by the desktop's column and by the phone's sheet alike.
  const groups = (
    <>
      <StorefrontCategoryFilter {...categoryFilterOf(place, catalogue, routes)} locale={locale} messages={ui} />
      {/* Keyed by the range in force, so the fields forget what was typed once the address moves on. */}
      {price ? <StorefrontPriceFilter key={`${price.value?.min}-${price.value?.max}`} {...price} locale={locale} messages={ui} /> : null}
      <StorefrontDiscountFilter {...discountFilterOf(place, catalogue, routes)} locale={locale} messages={ui} />
      {optionFiltersOf(place, catalogue, routes).map((group) => (
        <StorefrontOptionFilter key={group.title} title={group.title} values={group.values} locale={locale} messages={ui} />
      ))}
    </>
  )

  return (
    <StorefrontListingControls className="flex gap-7 pt-5 pb-10">
      <StorefrontFilterColumn chips={chips} clearHref={clearFiltersHrefOf(place, routes)} messages={ui}>
        {groups}
      </StorefrontFilterColumn>

      <div className="flex min-w-0 flex-1 flex-col gap-6">
        {/* The phone's door to the same groups, and what is in force, above the grid. */}
        <div className="flex flex-col gap-3 shop-lg:hidden">
          <StorefrontFilterSheet applied={chips.length} total={catalogue.total} locale={locale} messages={ui}>
            {groups}
          </StorefrontFilterSheet>
          <StorefrontFilterChips chips={chips} messages={ui} />
        </div>

        {/*
          The level below this one, on a phone: the column carries it from shop-lg, and the phone's
          sheet needs scripting, so this row stays as the door that works without it.
          "Tudo" here points back at this category: from inside Proteínas, everything is every protein.
        */}
        {category && subcategories.length ? (
          <div className="shop-lg:hidden">
            <StorefrontCategories
              categories={subcategories}
              active={null}
              href={(childSlug) => routes.category(childSlug || category.slug)}
              messages={ui}
            />
          </div>
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
          {...(layout.showQuickAdd ?? true ? { cardAction: (product: StorefrontProduct) => <StorefrontCardCartLive product={product} messages={ui} /> } : {})}
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
    </StorefrontListingControls>
  )
}
