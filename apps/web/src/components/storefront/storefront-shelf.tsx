// Types
import type { PublicComponent, PublicProductCard } from "@harness-monorepo/contracts"

// UI
import type { LinkComponent } from "@harness-monorepo/ui/blocks/auth/auth-link"
import { StorefrontProductGrid } from "@harness-monorepo/ui/blocks/storefront/storefront-product-grid"
import { StorefrontProductRail } from "@harness-monorepo/ui/blocks/storefront/storefront-product-rail"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// App
import type { StorefrontRoutes } from "@/lib/storefront-routes"
import { gridColumnsOf } from "./grid-columns"

export interface StorefrontShelfProps {
  /** A PRODUCTS component, its cards already resolved from its source by the public read. */
  component: PublicComponent
  routes: StorefrontRoutes
  showPrice: boolean
  showBadge: boolean
  linkComponent?: LinkComponent
  messages: UiMessages
}

/**
 * One showcase of products, as a rail or as a grid — the shopkeeper's `display`, and a rail when
 * none was chosen, because a rail is what every showcase drew before there was a choice.
 *
 * A category showcase is titled and led by its category unless the shopkeeper named it: renaming
 * the category renames the shelf, and its "ver tudo" goes where the rest of that category is.
 */
export function StorefrontShelf({
  component,
  routes,
  showPrice,
  showBadge,
  linkComponent,
  messages,
}: StorefrontShelfProps) {
  const category = component.sourceCategory
  const columns = gridColumnsOf(component.columns)
  const shelf = {
    products: component.items as PublicProductCard[],
    productHref: routes.product,
    title: component.title ?? category?.name ?? messages.storefront.catalogTitle,
    // The line a grouped shelf carried over its category's name, kept when it became a showcase.
    ...(category?.description ? { label: category.description } : {}),
    seeAllHref: category ? routes.category(category.slug) : routes.catalog(),
    locale: "pt-BR",
    showPrice,
    showBadge,
    ...(linkComponent ? { linkComponent } : {}),
    messages,
  }

  return component.display === "GRID" ? (
    <StorefrontProductGrid {...shelf} {...(columns ? { columns } : {})} />
  ) : (
    <StorefrontProductRail {...shelf} />
  )
}
