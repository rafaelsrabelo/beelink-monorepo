// Types
import type {
  PublicProduct,
  PublicProductCard,
  PublicProductCategory,
  PublicStore,
  StorefrontCatalog,
} from "@harness-monorepo/contracts"

// App
import { callPublicApi } from "./public-api"
import { catalogTag, storeTag } from "./revalidate"

/**
 * The reads every storefront page shares.
 *
 * Six pages now ask for the same two things, and the tag each read carries is the part that must
 * not drift: a shop and its catalogue expire on different writes, and a page that tagged one as the
 * other would either serve a stale price or drop a shop's colours every time a product changed.
 * One module, one answer to that.
 *
 * All of it is anonymous by construction — `callPublicApi` and never `callApi`, so no token travels
 * this way and nothing cached here can be one visitor's answer handed to the next.
 */

/** How many products one CATEGORY rail asks for. A landing shows a selection, not the shop. */
export const RAIL_PAGE_SIZE = 12

/**
 * How many products the single band asks for when the shop is not grouped by category.
 *
 * Twenty-four is the catalogue endpoint's own default, written here rather than inherited: a
 * default that changes on the other side would change this page without appearing in this file.
 *
 * It is not "every product", and it cannot be — the endpoint closes the page at
 * `PRODUCTS_PAGE_SIZE_MAX = 96`, so `?porPagina=500` answers `pageSize: 96`. A shop with more than
 * this shows its first ones in the order the shopkeeper arranged them, and the "see all" beside the
 * band is where the rest is. Loading ninety-six cards on a shop's most visited address to show four
 * is the trade this number refuses.
 */
export const HOME_RAIL_PAGE_SIZE = 24

/**
 * How many category rails the home will draw, when the shop is grouped by category.
 *
 * The home asks for one page per rail, so this is also how many round trips it makes. A shop with
 * thirty categories would otherwise turn its most visited address into thirty-one requests, and
 * nobody scrolls past the sixth band anyway. The categories band at the top still lists every one
 * of them, so nothing becomes unreachable — it just stops being on the home.
 */
export const HOME_RAILS_MAX = 6

export async function shopAt(slug: string): Promise<PublicStore | null> {
  const response = await callPublicApi({ path: `/stores/${slug}/public`, tags: [storeTag(slug)] })

  if (!response.ok) return null

  return (await response.json()) as PublicStore
}

export interface CatalogueAsk {
  category?: string
  search?: string
  page?: number
  pageSize?: number
}

/**
 * The catalogue, filtered and paged as the address asks.
 *
 * Under `catalogTag` and not `storeTag`: a price change should not drop the shop's colours from the
 * cache, and a colour change should not drop every paged catalogue with it.
 */
export async function catalogueAt(slug: string, ask: CatalogueAsk = {}): Promise<StorefrontCatalog> {
  const query = new URLSearchParams()
  if (ask.category) query.set("categoria", ask.category)
  if (ask.search) query.set("busca", ask.search)
  if (ask.page && ask.page > 1) query.set("pagina", String(ask.page))
  if (ask.pageSize) query.set("porPagina", String(ask.pageSize))

  const suffix = query.size ? `?${query.toString()}` : ""

  const response = await callPublicApi({
    path: `/stores/${slug}/catalog${suffix}`,
    tags: [catalogTag(slug)],
  })

  // A catalogue that would not load is an empty shelf, never a broken page: the shop's name, its
  // description and its WhatsApp are worth serving on their own. `pageSize` is echoed as asked so
  // the pager divides by something rather than by zero.
  if (!response.ok) {
    return { categories: [], products: [], total: 0, page: ask.page ?? 1, pageSize: ask.pageSize ?? 1 }
  }

  return (await response.json()) as StorefrontCatalog
}

export async function productAt(slug: string, productSlug: string): Promise<PublicProduct | null> {
  const response = await callPublicApi({
    path: `/stores/${slug}/catalog/${productSlug}`,
    tags: [catalogTag(slug)],
  })

  if (!response.ok) return null

  return (await response.json()) as PublicProduct
}

/** How many pages a total divides into. Never zero: an empty shop still has one page to be on. */
export function pageCountOf(total: number, pageSize: number): number {
  return Math.max(1, Math.ceil(total / Math.max(pageSize, 1)))
}

/**
 * One band of products on the home, and what it is a band of.
 *
 * A union and not a `{ title }`: the copy belongs to the screen, which holds the dictionary, and a
 * data module that carried a heading would be a data module that has to be told a language.
 */
export type HomeBand =
  | { kind: "all"; products: PublicProductCard[] }
  | { kind: "category"; category: PublicProductCategory; products: PublicProductCard[] }

export interface HomeContent {
  /** Every category the shop shows, for the menu and for the poster band — never only the banded ones. */
  categories: PublicProductCategory[]
  bands: HomeBand[]
}

/**
 * What the home draws, and how many round trips it costs.
 *
 * It lives here rather than in the page body for one reason: the page is an `async` Server
 * Component, and this repository has no way to test one — `apps/web/src/app` carries tests for the
 * route handlers and for nothing else. A choice that decides what every visitor sees first should
 * not be the one thing on the page that nothing can assert, so the choice moved to a function and
 * the page became a mapping from bands to JSX.
 *
 * **Not grouped is one request, not two.** The catalogue endpoint answers with the categories and
 * the products together, so the band and the shop's menu come out of the same read. Grouped still
 * costs `1 + N`: the list has to be in hand before there is anything to ask for.
 */
export async function homeAt(slug: string, byCategory: boolean): Promise<HomeContent> {
  if (!byCategory) {
    const index = await catalogueAt(slug, { pageSize: HOME_RAIL_PAGE_SIZE })

    return { categories: index.categories, bands: [{ kind: "all", products: index.products }] }
  }

  // One product, because nothing here reads it: this call is for the category list, and asking for
  // a page of products the page will not draw is a page of products paid for twice.
  const index = await catalogueAt(slug, { pageSize: 1 })

  const bands = await Promise.all(
    index.categories.slice(0, HOME_RAILS_MAX).map(async (category): Promise<HomeBand> => ({
      kind: "category",
      category,
      products: (await catalogueAt(slug, { category: category.slug, pageSize: RAIL_PAGE_SIZE })).products,
    })),
  )

  return { categories: index.categories, bands }
}
