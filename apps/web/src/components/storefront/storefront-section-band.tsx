// React
import { Suspense } from "react"

// Types
import type { StorefrontCatalog } from "@harness-monorepo/contracts"

// UI
import { Skeleton } from "@harness-monorepo/ui/components/skeleton"
import { StorefrontBreadcrumb } from "@harness-monorepo/ui/blocks/storefront/storefront-breadcrumb"
import { StorefrontResultsBand } from "@harness-monorepo/ui/blocks/storefront/storefront-results-band"
import { StorefrontSort } from "@harness-monorepo/ui/blocks/storefront/storefront-sort"

// App
import { StorefrontResultsSummary } from "./storefront-results-summary"
import { headingOf, sortFormOf, sortOptionsOf, type SectionPlace } from "@/lib/storefront-section"
import type { StorefrontRoutes } from "@/lib/storefront-routes"

export interface StorefrontSectionBandProps {
  place: SectionPlace
  routes: StorefrontRoutes
  /** The shelf on its way, on the pages that have one; the count and the sort come with it. */
  catalogue?: Promise<StorefrontCatalog>
  locale: string
}

/**
 * The band at the top of every section page, 5a's results band: the trail, the page's `h1`, and on
 * a shelf the count and the sort. The title never waits — it is known from the address — and only
 * the count streams in beside it.
 *
 * A category sits under the catalogue, and a subcategory under its parent: the trail is the only
 * place in the shop that says so, because the URL is flat and `/loja/whey` gives away nothing about
 * `Proteínas`. The others hang straight off the front door.
 */
export function StorefrontSectionBand({ place, routes, catalogue, locale }: StorefrontSectionBandProps) {
  const { category, parentCategory, section, term, messages: ui } = place
  const heading = headingOf(place)
  const sort = catalogue ? sortFormOf(place, routes) : null
  // A search with nothing typed has nothing to count against.
  const counted = catalogue && !(section.kind === "search" && !term)

  return (
    <StorefrontResultsBand
      heading={heading}
      breadcrumb={
        <StorefrontBreadcrumb
          homeHref={routes.home}
          items={
            category
              ? [
                  // "Produtos", as 5a spells the catalogue's crumb, not the shelf's own title.
                  { label: ui.storefront.productsHeading, href: routes.catalog() },
                  ...(parentCategory ? [{ label: parentCategory.name, href: routes.category(parentCategory.slug) }] : []),
                  { label: category.name },
                ]
              : [{ label: heading }]
          }
          messages={ui}
        />
      }
      summary={
        counted ? (
          <Suspense fallback={<Skeleton aria-hidden="true" className="h-4 w-40 self-center" />}>
            <StorefrontResultsSummary catalogue={catalogue} {...(section.kind === "search" && term ? { term } : {})} locale={locale} messages={ui} />
          </Suspense>
        ) : undefined
      }
    >
      {sort ? <StorefrontSort action={sort.action} name="ordenar" value={sort.value} options={sortOptionsOf(place)} fields={sort.fields} messages={ui} /> : null}
    </StorefrontResultsBand>
  )
}
