// Types
import type { StorefrontCatalog } from "@harness-monorepo/contracts"
import type { StorefrontCategoryFilterProps } from "@harness-monorepo/ui/blocks/storefront/storefront-category-filter"
import type { StorefrontDiscountFilterProps } from "@harness-monorepo/ui/blocks/storefront/storefront-discount-filter"
import type { StorefrontFilterChip } from "@harness-monorepo/ui/blocks/storefront/storefront-filter-column"
import type { StorefrontFilterValue } from "@harness-monorepo/ui/blocks/storefront/storefront-option-filter"
import type { StorefrontPriceFilterProps } from "@harness-monorepo/ui/blocks/storefront/storefront-price-filter"
import { format } from "@harness-monorepo/ui/locales/index"

// App
import { toggledOption, type ListingFilters, type StorefrontRoutes } from "./storefront-routes"
import { pageHrefOf, type SectionPlace } from "./storefront-section"

/** This shelf again, at page 1, under other filters: a filter that changes starts the list over. */
function shelfWith(place: SectionPlace, routes: StorefrontRoutes, filters: ListingFilters): string {
  return pageHrefOf({ ...place, filters }, routes)(1)
}

/**
 * The filters in force as 5a's chips, each a link to the shelf without it. The address is read
 * rather than the API's `applied`, so the labels are the page's own: the price range is one chip,
 * a sale reads "Em promoção", an option shows its value alone. The route's category and the searched
 * term are where the shopper is, not something they narrowed by, and never become one.
 */
export function filterChipsOf(place: SectionPlace, routes: StorefrontRoutes, locale: string): StorefrontFilterChip[] {
  const text = place.messages.storefront
  const filters = place.filters
  const money = new Intl.NumberFormat(locale, { style: "currency", currency: "BRL", maximumFractionDigits: 0 })
  const chips: StorefrontFilterChip[] = []

  if (filters.priceMin !== undefined || filters.priceMax !== undefined) {
    const min = filters.priceMin !== undefined ? money.format(filters.priceMin) : undefined
    const max = filters.priceMax !== undefined ? money.format(filters.priceMax) : undefined
    const label = min && max ? format(text.filterPriceBetween, { min, max }) : max ? format(text.filterPriceUpTo, { max }) : format(text.filterPriceFrom, { min: min ?? "" })

    chips.push({ label, href: shelfWith(place, routes, { ...filters, priceMin: undefined, priceMax: undefined }) })
  }

  if (filters.discount || filters.discountMinPercent) {
    chips.push({
      label: filters.discountMinPercent ? format(text.filterDiscountAtLeast, { percent: String(filters.discountMinPercent) }) : text.filterOnSale,
      href: shelfWith(place, routes, { ...filters, discount: undefined, discountMinPercent: undefined }),
    })
  }

  for (const option of filters.options ?? []) {
    chips.push({ label: option.slice(option.indexOf(":") + 1).trim(), href: shelfWith(place, routes, toggledOption(filters, option)) })
  }

  return chips
}

/**
 * How many filters narrow the shelf: the price range, the discount, each option value, and the
 * category a catalogue or a search is narrowed to. The order is not one: it rearranges, it hides
 * nothing. Three or more make a combination worth no search result of its own.
 */
export function filterCountOf({ filters, scope }: Pick<SectionPlace, "filters" | "scope">): number {
  const price = filters.priceMin !== undefined || filters.priceMax !== undefined ? 1 : 0
  return price + (filters.discount ? 1 : 0) + (filters.options?.length ?? 0) + (scope ? 1 : 0)
}

/** The shelf with every chip taken off: the order, the term and a search's category stay. */
export function clearFiltersHrefOf(place: SectionPlace, routes: StorefrontRoutes): string {
  return shelfWith(place, routes, place.filters.sort ? { sort: place.filters.sort } : {})
}

/**
 * The column's "Categoria" group, per page, as 5a draws it. Counts come from the facet — which
 * counts under every filter but the category's own, a parent holding its children — and names and
 * parents from the navigation, which the facet does not carry. A category with nothing under the
 * other filters is left out rather than offered as a dead end. The other filters travel along.
 */
export function categoryFilterOf(
  place: SectionPlace,
  catalogue: Pick<StorefrontCatalog, "facets">,
  routes: StorefrontRoutes,
): Omit<StorefrontCategoryFilterProps, "locale" | "linkComponent" | "messages"> {
  const { section, category, parentCategory, navigation, filters, scope, term, messages } = place
  const counts = new Map(catalogue.facets.categories.map((entry) => [entry.value, entry.count]))
  const countOf = (slug: string) => counts.get(slug) ?? 0

  if (section.kind === "category" && category) {
    // A subcategory is the bottom: the way up, and where it is.
    if (category.parentSlug) {
      return {
        back: parentCategory
          ? { label: parentCategory.name, href: routes.category(parentCategory.slug, filters) }
          : { label: messages.storefront.catalogTitle, href: routes.catalog(filters) },
        current: category.name,
        entries: [],
      }
    }

    return {
      back: { label: messages.storefront.catalogTitle, href: routes.catalog(filters) },
      current: category.name,
      entries: navigation.categories
        .filter((entry) => entry.parentSlug === category.slug && countOf(entry.slug) > 0)
        .map((entry) => ({ slug: entry.slug, label: entry.name, href: routes.category(entry.slug, filters), count: countOf(entry.slug) })),
    }
  }

  // The catalogue and a search: the first level. The one they are narrowed to is marked, and its
  // link takes the narrowing off; the others narrow — a search to a category, the catalogue to a
  // category's own page.
  return {
    entries: navigation.categories
      .filter((entry) => !entry.parentSlug && countOf(entry.slug) > 0)
      .map((entry) => {
        const selected = scope === entry.slug
        const href =
          section.kind === "search"
            ? routes.search(term, { ...filters, category: selected ? undefined : entry.slug })
            : selected
              ? routes.catalog(filters)
              : routes.category(entry.slug, filters)

        return { slug: entry.slug, label: entry.name, href, count: countOf(entry.slug), selected }
      }),
  }
}

/**
 * One group per option on the shelf, each value a link to the shelf with it toggled. A value with
 * nothing under the other filters is left out, unless it is the one chosen — a filter in force
 * has to stay visible to be taken off.
 */
export function optionFiltersOf(
  place: SectionPlace,
  catalogue: Pick<StorefrontCatalog, "facets">,
  routes: StorefrontRoutes,
): { title: string; values: StorefrontFilterValue[] }[] {
  const { filters } = place
  // The address may spell a value differently from the facet ("sabor:uva"); toggle what it holds.
  const held = (key: string) => (filters.options ?? []).find((entry) => entry.toLocaleLowerCase() === key.toLocaleLowerCase())

  return catalogue.facets.options
    .map((option) => ({
      title: option.name,
      values: option.values
        .filter((entry) => entry.available || entry.selected)
        .map((entry) => {
          const key = `${option.name}:${entry.value}`
          const inForce = held(key)

          return {
            value: entry.value,
            label: entry.label,
            href: shelfWith(place, routes, toggledOption(filters, inForce ?? key)),
            count: entry.count,
            selected: entry.selected || inForce !== undefined,
            colorHex: entry.colorHex,
          }
        }),
    }))
    .filter((group) => group.values.length)
}

/** The "Desconto" group: on sale at all, then each minimum cut the shelf offers, one at a time. */
export function discountFilterOf(
  place: SectionPlace,
  catalogue: Pick<StorefrontCatalog, "facets">,
  routes: StorefrontRoutes,
): Pick<StorefrontDiscountFilterProps, "onSale" | "ranges"> {
  const { filters } = place
  const { discount } = catalogue.facets
  const off = { ...filters, discount: undefined, discountMinPercent: undefined }
  const onSaleOnly = Boolean(filters.discount && !filters.discountMinPercent)

  return {
    onSale:
      discount.count > 0 || onSaleOnly
        ? { href: shelfWith(place, routes, onSaleOnly ? off : { ...off, discount: true }), count: discount.count, selected: onSaleOnly }
        : null,
    ranges: discount.ranges
      .filter((range) => range.count > 0 || filters.discountMinPercent === range.minPercent)
      .map((range) => {
        const selected = filters.discountMinPercent === range.minPercent

        return {
          percent: range.minPercent,
          href: shelfWith(place, routes, selected ? off : { ...off, discount: true, discountMinPercent: range.minPercent }),
          count: range.count,
          selected,
        }
      }),
  }
}

/** 5a's quick ranges, whole reais; an open end is undefined. The API does not count by range. */
const PRICE_RANGES: readonly (readonly [number | undefined, number | undefined])[] = [
  [undefined, 50],
  [50, 100],
  [100, 200],
  [200, undefined],
]

/**
 * The "Preço" group: the quick ranges that fall inside what the shelf costs, the slider's ends, and
 * the min/max form — the shelf's own address with every other filter as a hidden field. Null on a
 * shelf with no price to narrow and no price filter in force.
 */
export function priceFilterOf(
  place: SectionPlace,
  catalogue: Pick<StorefrontCatalog, "facets">,
  routes: StorefrontRoutes,
  locale: string,
): Omit<StorefrontPriceFilterProps, "locale" | "linkComponent" | "messages"> | null {
  const text = place.messages.storefront
  const { filters } = place
  const { price } = catalogue.facets
  const money = new Intl.NumberFormat(locale, { style: "currency", currency: "BRL", maximumFractionDigits: 0 })
  const bounds = price ? { min: Math.floor(price.minCents / 100), max: Math.ceil(price.maxCents / 100) } : null
  const priceless = { ...filters, priceMin: undefined, priceMax: undefined }

  if (!bounds && filters.priceMin === undefined && filters.priceMax === undefined) return null

  const ranges = PRICE_RANGES.filter(([low, high]) => !bounds || ((low ?? 0) <= bounds.max && (high ?? Number.POSITIVE_INFINITY) >= bounds.min)).map(
    ([low, high]) => {
      const selected = filters.priceMin === low && filters.priceMax === high
      const label =
        low === undefined
          ? format(text.filterPriceUpTo, { max: money.format(high ?? 0) })
          : high === undefined
            ? format(text.filterPriceAbove, { min: money.format(low) })
            : format(text.filterPriceBetween, { min: money.format(low), max: money.format(high) })

      return { label, selected, href: shelfWith(place, routes, selected ? priceless : { ...priceless, priceMin: low, priceMax: high }) }
    },
  )
  const form = new URL(shelfWith(place, routes, priceless), "http://shop.invalid")

  return {
    ranges,
    bounds,
    action: form.pathname,
    fields: [...form.searchParams.entries()],
    value: {
      ...(filters.priceMin !== undefined ? { min: filters.priceMin } : {}),
      ...(filters.priceMax !== undefined ? { max: filters.priceMax } : {}),
    },
  }
}
