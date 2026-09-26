// Types
import type { PublicComponent, PublicProductCategory } from "@harness-monorepo/contracts"

// UI
import type { LinkComponent } from "@harness-monorepo/ui/blocks/auth/auth-link"
import { StorefrontCategoryChips } from "@harness-monorepo/ui/blocks/storefront/storefront-category-chips"
import { StorefrontCategoryGrid } from "@harness-monorepo/ui/blocks/storefront/storefront-category-grid"
import { StorefrontCategoryRail } from "@harness-monorepo/ui/blocks/storefront/storefront-category-rail"
import { StorefrontHeading } from "@harness-monorepo/ui/blocks/storefront/storefront-heading"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// App
import type { StorefrontRoutes } from "@/lib/storefront-routes"
import { gridColumnsOf } from "./grid-columns"

export interface StorefrontCategoriesBlockProps {
  /** A CATEGORIES component: its title, its format and, in a grid, its columns. */
  component: PublicComponent
  /** Every category the shop shows. The block draws these; the component holds none of its own. */
  categories: readonly PublicProductCategory[]
  routes: StorefrontRoutes
  linkComponent?: LinkComponent
  messages: UiMessages
}

/**
 * The shop's categories, on a rail or in rows — the shopkeeper's `display`, and a grid when there is
 * none, because a grid is what every categories block drew before there was a choice.
 */
export function StorefrontCategoriesBlock({
  component,
  categories,
  routes,
  linkComponent,
  messages,
}: StorefrontCategoriesBlockProps) {
  const columns = gridColumnsOf(component.columns)
  const shared = {
    categories: categories.map((category) => ({
      id: category.id,
      slug: category.slug,
      name: category.name,
      imageUrl: category.imageUrl,
      description: category.description,
      productCount: category.productCount,
    })),
    href: routes.category,
    catalogHref: routes.catalog(),
    locale: "pt-BR",
    ...(linkComponent ? { linkComponent } : {}),
    messages,
  }

  return (
    <div className="flex flex-col gap-4">
      {component.title ? <StorefrontHeading title={component.title} subtitle={component.subtitle} /> : null}
      {component.display === "CHIPS" ? (
        <StorefrontCategoryChips
          categories={shared.categories}
          href={shared.href}
          {...(component.title ? { label: component.title } : {})}
          {...(linkComponent ? { linkComponent } : {})}
          messages={messages}
        />
      ) : component.display === "RAIL" ? (
        <StorefrontCategoryRail {...shared} {...(component.title ? { label: component.title } : {})} />
      ) : (
        <StorefrontCategoryGrid {...shared} {...(columns ? { columns } : {})} />
      )}
    </div>
  )
}
