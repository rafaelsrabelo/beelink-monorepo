// Types
import type { PublicProductCategory, PublicStore, StorefrontSort } from "@harness-monorepo/contracts"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// App
import { getMessages } from "./locale"
import { navigationAt, shopAt, type CatalogueAsk, type ShopNavigation } from "./storefront-data"
import {
  MODE_KEY,
  PAGE_KEY,
  SEARCH_KEY,
  listingFiltersOf,
  pageOf,
  paramOf,
  sectionOf,
  signInModeOf,
  type ListingFilters,
  type SignInMode,
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
  /** On the sign-in page, which of its faces the address asks for. */
  signInMode: SignInMode
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
    signInMode: signInModeOf(query[MODE_KEY]),
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

/** The page's own title, which is also its `h1`. A search narrowed to a category is titled by it, as in 5a. */
export function headingOf({ section, category, navigation, scope, signInMode, messages }: SectionPlace): string {
  const text = messages.storefront
  const scoped = scope ? navigation.categories.find((entry) => entry.slug === scope)?.name : undefined

  switch (section.kind) {
    case "catalog":
      return text.catalogTitle
    case "categories":
      return text.categoriesTitle
    case "search":
      return scoped ?? text.searchHeading
    case "cart":
      return text.cart
    case "signIn":
      return signInMode === "criar" ? text.signUpTitle : signInMode === "senha" ? text.forgotTitle : text.signInTitle
    case "account":
      return text.account
    case "category":
      return category?.name ?? text.catalogTitle
  }
}

/** The orders the API understands, in 5a's order. "Mais vendidos" and "Melhor avaliados" wait for data. */
export function sortOptionsOf({ messages }: SectionPlace): { value: StorefrontSort; label: string }[] {
  const text = messages.storefront

  return [
    { value: "relevancia", label: text.sortRelevance },
    { value: "menor-preco", label: text.sortPriceAsc },
    { value: "maior-preco", label: text.sortPriceDesc },
    { value: "maior-desconto", label: text.sortDiscount },
    { value: "novidades", label: text.sortNewest },
  ]
}

/**
 * The sort's form: the shelf's own address as the action, and every filter but the order and the
 * page as hidden fields — a new order keeps the shelf and starts it again at page 1.
 */
export function sortFormOf(place: SectionPlace, routes: StorefrontRoutes) {
  const href = pageHrefOf({ ...place, filters: { ...place.filters, sort: undefined } }, routes)(1)
  const url = new URL(href, "http://shop.invalid")

  return {
    action: url.pathname,
    fields: [...url.searchParams.entries()] as [string, string][],
    value: place.filters.sort ?? "relevancia",
  }
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
    case "signIn":
      return routes.signIn()
    case "account":
      return routes.account()
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
