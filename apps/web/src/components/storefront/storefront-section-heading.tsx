// UI
import { StorefrontBreadcrumb } from "@harness-monorepo/ui/blocks/storefront/storefront-breadcrumb"
import { StorefrontCategories } from "@harness-monorepo/ui/blocks/storefront/storefront-categories"

// App
import { headingOf, type SectionPlace } from "@/lib/storefront-section"
import type { StorefrontRoutes } from "@/lib/storefront-routes"

export interface StorefrontSectionHeadingProps {
  place: SectionPlace
  routes: StorefrontRoutes
  /** The line under the title — a count, or what a search found — once the shelf has answered. */
  subtitle?: string
}

/**
 * The page's own `h1`, written here rather than taken from StorefrontSection: that block is a band
 * *of* a page and refuses level 1 on purpose, so a page that is nothing but one shelf has to say
 * what it is itself. Without this the catalogue, the categories and the search would each be a page
 * with no heading at all — the shop's name in band 5 belongs to the home.
 */
export function StorefrontSectionHeading({ place, routes, subtitle }: StorefrontSectionHeadingProps) {
  const { category, parentCategory, navigation, messages: ui } = place
  const heading = headingOf(place)

  // Only on a category's own page, and only its own children: the catalogue is every category at
  // once and has the menu for that.
  const subcategories = category ? navigation.categories.filter((entry) => entry.parentSlug === category.slug) : []

  return (
    <header className="flex flex-col gap-3">
      {/*
        A category sits under the catalogue, and a subcategory under its parent — the trail is the
        only place in the shop that says so, because the URL is flat and `/loja/whey` gives away
        nothing about `Proteínas`. The others hang straight off the front door; there is no shelf
        above "Busca".
      */}
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

      <h1 className="text-2xl font-semibold">{heading}</h1>
      {subtitle ? <p className="text-sm opacity-70">{subtitle}</p> : null}

      {/*
        The level below this one, where it belongs. The menu at the top of the shop draws the first
        level only — nineteen subheadings in one row is not a menu — so a category's own page is
        where its subcategories become reachable.

        "Tudo" here points back at this category, not at the catalogue: from inside Proteínas,
        everything means every protein.
      */}
      {subcategories.length ? (
        <StorefrontCategories
          categories={subcategories}
          active={null}
          href={(childSlug) => (childSlug ? routes.category(childSlug) : routes.category(category?.slug ?? ""))}
          messages={ui}
        />
      ) : null}
    </header>
  )
}
