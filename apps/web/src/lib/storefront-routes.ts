// Types
import type { StorefrontRouteWords } from "@harness-monorepo/contracts"

/**
 * The key a search term travels under on the shop's own URL.
 *
 * `q` and not the shop's word for it: `routeWords` spells the **path**, which is what a person
 * reads and what a printed card carries, and a query key is neither. `?q=` is also what search
 * boxes across the web use, so a link built by hand or pasted from elsewhere tends to work.
 */
export const SEARCH_KEY = "q"

/**
 * The page, on the shop's own URL.
 *
 * Portuguese, because the API's own query keys are (`categoria`, `busca`, `pagina`), and one
 * spelling on both sides is what keeps the mapping between them readable at a glance. It is **not**
 * a route word: switching a shop to EN moves `/produtos` to `/products` and leaves this alone. That
 * is a gap, and it is written here rather than left to be discovered.
 */
export const PAGE_KEY = "pagina"

/** Everything a URL needs to know about a shop, and nothing else — a page passes its store. */
export interface StorefrontShop {
  slug: string
  routeWords: StorefrontRouteWords
}

/**
 * What the second segment of a storefront URL turned out to mean.
 *
 * `category` is the fallback and not a case the words select, which is the whole shape of the
 * scheme: `/<shop>/<segment>` is a category **unless** the segment is a word the router already
 * means something by. The API refuses those words as category slugs (`RESERVED_PATH_SEGMENTS`), so
 * the two halves agree instead of relying on each other.
 */
export type StorefrontSection =
  | { kind: "catalog" }
  | { kind: "categories" }
  | { kind: "search" }
  | { kind: "cart" }
  | { kind: "category"; slug: string }

export interface CatalogueQuery {
  page?: number
  category?: string
  search?: string
}

/** Drops the empty and the first page, so `/lessari/produtos` never renders as `?pagina=1`. */
function withQuery(path: string, entries: Record<string, string | number | undefined>): string {
  const query = new URLSearchParams()

  for (const [key, value] of Object.entries(entries)) {
    if (value === undefined || value === "") continue
    if (key === PAGE_KEY && Number(value) <= 1) continue
    query.set(key, String(value))
  }

  return query.size ? `${path}?${query.toString()}` : path
}

/**
 * Every address the shop window renders, built from the shop's own words.
 *
 * This file is the only place in `apps/web` that may spell a storefront segment. That is what
 * `Store.routeVocabulary` buys: one column decides every link at once, where literals scattered
 * through components move only where somebody remembers to move them — and the day a shop switches
 * to EN, a forgotten `"produtos"` is a dead link on a page nobody opened while testing.
 */
export function storefrontRoutes(shop: StorefrontShop) {
  const { slug, routeWords } = shop
  const home = `/${slug}`

  return {
    home,

    /** The whole catalogue, in a grid. The home shows a selection and links here. */
    catalog: ({ page, category, search }: CatalogueQuery = {}) =>
      withQuery(`${home}/${routeWords.products}`, {
        [PAGE_KEY]: page,
        categoria: category,
        [SEARCH_KEY]: search,
      }),

    /** The index of every category. A single category has no word in front of it. */
    categories: () => `${home}/${routeWords.categories}`,

    /** One category, at the flat second segment: `/lessari/blusas`. */
    category: (categorySlug: string, { page }: { page?: number } = {}) =>
      withQuery(`${home}/${categorySlug}`, { [PAGE_KEY]: page }),

    /** Where the header's search box posts. The term is the caller's; an empty one is dropped. */
    search: (term?: string, { page }: { page?: number } = {}) =>
      withQuery(`${home}/${routeWords.search}`, { [SEARCH_KEY]: term, [PAGE_KEY]: page }),

    /** The basket, which the header's icon points at from the first day. */
    cart: () => `${home}/${routeWords.cart}`,

    /** One product. It never nests under a category: a product in two would have two addresses. */
    product: (productSlug: string) => `${home}/${routeWords.products}/${productSlug}`,
  }
}

export type StorefrontRoutes = ReturnType<typeof storefrontRoutes>

/**
 * What a second segment means to this shop.
 *
 * The order is the contract. A route word wins over a category of the same name, which is why the
 * API refuses those slugs on the way in — the check here would otherwise be the only thing standing
 * between a shopkeeper and a category they can save but never open.
 *
 * It does not resolve another vocabulary's words. The web is handed this shop's `routeWords` and no
 * table of the rest, so `/lessari/products` on a PT_BR shop falls through to `category` and 404s at
 * the lookup. That costs nothing today — no panel screen can change a shop's vocabulary, so no shop
 * has an old word for a link to hold — and the day one can, the redirect the schema promises needs
 * the alias table to travel with `routeWords`. This comment is where that starts.
 */
export function sectionOf(segment: string, routeWords: StorefrontRouteWords): StorefrontSection {
  if (segment === routeWords.products) return { kind: "catalog" }
  if (segment === routeWords.categories) return { kind: "categories" }
  if (segment === routeWords.search) return { kind: "search" }
  if (segment === routeWords.cart) return { kind: "cart" }

  return { kind: "category", slug: segment }
}

/**
 * The page asked for, as a number a query can be built from.
 *
 * Anything that is not a whole number above zero is the first page rather than an error: this is the
 * indexed read path, and a crawler following a hand-edited `?pagina=abc` should land on the shop.
 */
export function pageOf(raw: string | string[] | undefined): number {
  const value = typeof raw === "string" ? Number.parseInt(raw, 10) : Number.NaN

  return Number.isInteger(value) && value > 0 ? value : 1
}

/** A query parameter as a page reads it: a single string, or nothing at all. */
export function paramOf(raw: string | string[] | undefined): string | undefined {
  const value = typeof raw === "string" ? raw.trim() : ""

  return value === "" ? undefined : value
}
