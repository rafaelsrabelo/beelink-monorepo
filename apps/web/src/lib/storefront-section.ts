// Types
import type { PublicProductCategory, PublicStore, StorefrontCatalog } from "@harness-monorepo/contracts"
import { format } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// App
import { getMessages } from "./locale"
import { navigationAt, shopAt, type CatalogueAsk, type ShopNavigation } from "./storefront-data"
import {
  PAGE_KEY,
  SEARCH_KEY,
  listingFiltersOf,
  pageOf,
  paramOf,
  sectionOf,
  type ListingFilters,
  type StorefrontRoutes,
  type StorefrontSection,
} from "./storefront-routes"

/** Sixteen: the 4 × 4 grid the 5a design draws. The API's default of 24 is for a shelf with no column. */
export const LISTING_PAGE_SIZE = 16

export type SectionQuery = Record<string, string | string[] | undefined>

/**
 * What the second segment of a shop's URL turned out to mean, and everything that follows from the
 * address alone. It holds no products on purpose: it is resolved before the page streams, so a
 * section or a category that does not exist can still answer 404 rather than a 200 that says so.
 */
export interface SectionPlace {
  store: PublicStore
  section: StorefrontSection
  navigation: ShopNavigation
  /** The category whose own page this is. Null on every page that is not one. */
  category: PublicProductCategory | null
  /**
   * The shelf this one sits on, for the trail. Null for a top level, and for a child whose parent
   * has been hidden — a crumb pointing at a category a visitor cannot open is worse than no crumb.
   */
  parentCategory: PublicProductCategory | null
  /** The category a search or the whole catalogue was narrowed to, from `?categoria=`. */
  scope: string | undefined
  messages: UiMessages
  page: number
  term: string | undefined
  filters: ListingFilters
}

/**
 * The place, in one pass, so `generateMetadata` and the body agree about what the segment meant —
 * two resolutions of the same URL are two chances to disagree. Null is a 404.
 *
 * It reads the shop's navigation, which is cached and carries every category the shop has, never
 * the ones a filter left: that is enough to tell a real category from `/lessari/qualquer-coisa`.
 */
export async function placeOf(slug: string, segment: string, query: SectionQuery): Promise<SectionPlace | null> {
  const store = await shopAt(slug)

  if (!store) return null

  const section = sectionOf(segment, store.routeWords)
  const [{ ui }, navigation] = await Promise.all([getMessages(), navigationAt(slug)])
  const category =
    section.kind === "category" ? (navigation.categories.find((entry) => entry.slug === section.slug) ?? null) : null

  if (section.kind === "category" && !category) return null

  const parentCategory = category?.parentSlug
    ? (navigation.categories.find((entry) => entry.slug === category.parentSlug) ?? null)
    : null

  return {
    store,
    section,
    navigation,
    category,
    parentCategory,
    scope: section.kind === "category" ? undefined : paramOf(query.categoria),
    messages: ui,
    page: pageOf(query[PAGE_KEY]),
    term: paramOf(query[SEARCH_KEY]),
    filters: listingFiltersOf(query),
  }
}

/** Whether this section is a shelf of products — the only ones that ask the catalogue for any. */
export function isShelf(place: SectionPlace): boolean {
  const { kind } = place.section
  return kind === "catalog" || kind === "category" || kind === "search"
}

/** What the catalogue is asked for on this shelf. */
export function listingAskOf(place: SectionPlace): CatalogueAsk {
  const { section, filters, page, scope, term } = place

  return {
    page,
    ...filters,
    // A category page is its category; the catalogue and the search take one from the address,
    // which is what the header's "Buscar em" and a category's "ver tudo" write.
    category: section.kind === "category" ? section.slug : scope,
    ...(section.kind === "search" ? { search: term } : {}),
    pageSize: LISTING_PAGE_SIZE,
  }
}

/** The page's own title, which is also its `h1`. */
export function headingOf({ section, category, messages }: SectionPlace): string {
  const text = messages.storefront

  switch (section.kind) {
    case "catalog":
      return text.catalogTitle
    case "categories":
      return text.categoriesTitle
    case "search":
      return text.searchHeading
    case "cart":
      return text.cart
    case "category":
      return category?.name ?? text.catalogTitle
  }
}

/** The line under the title: how many, or what was searched for and found nothing. */
export function subtitleOf(place: SectionPlace, catalogue: Pick<StorefrontCatalog, "total">, locale: string): string | undefined {
  const { section, messages, term } = place
  const text = messages.storefront
  const count = new Intl.NumberFormat(locale).format(catalogue.total)

  if (section.kind === "categories" || section.kind === "cart") return undefined

  if (section.kind === "search") {
    if (!term) return undefined
    if (!catalogue.total) return format(text.searchEmpty, { term })

    return format(catalogue.total === 1 ? text.searchResultsOne : text.searchResults, { count, term })
  }

  return catalogue.total === 1 ? text.productCountOne : format(text.productCount, { count })
}

/**
 * The canonical is the unpaged, untermed address of this section. A shop's twelfth page of products
 * and its search for "croche" are the same shelf reached two ways, and pointing them all at one
 * address is what stops Google from treating each as a page of its own thin content.
 */
export function canonicalOf({ section, category }: SectionPlace, routes: StorefrontRoutes): string {
  switch (section.kind) {
    case "category":
      return category ? routes.category(category.slug) : routes.catalog()
    case "categories":
      return routes.categories()
    case "search":
      return routes.search()
    case "cart":
      return routes.cart()
    case "catalog":
      return routes.catalog()
  }
}

/**
 * Where this shelf's pager sends you. Each section pages on its own address, so the number in the
 * URL always belongs to the list that is on the screen.
 */
export function pageHrefOf(place: SectionPlace, routes: StorefrontRoutes): (page: number) => string {
  const { section, category, filters, scope, term } = place

  return (page) => {
    if (section.kind === "category" && category) return routes.category(category.slug, { ...filters, page })
    if (section.kind === "search") return routes.search(term, { ...filters, category: scope, page })

    return routes.catalog({ ...filters, category: scope, page })
  }
}
