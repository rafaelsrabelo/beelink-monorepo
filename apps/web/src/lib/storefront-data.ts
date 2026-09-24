// Types
import type {
  PublicProductCategory,
  PublicProductDetail,
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

/**
 * The shop and every showcase on its landing, cards included.
 *
 * Under both tags: the showcases' prices and pictures ride on this read, so a product write has to
 * drop it as surely as a colour change does. `revalidateStore` drops the two together today; the
 * second tag is what keeps this right the day something drops only the catalogue.
 */
export async function shopAt(slug: string): Promise<PublicStore | null> {
  const response = await callPublicApi({ path: `/stores/${slug}/public`, tags: [storeTag(slug), catalogTag(slug)] })

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
    return {
      categories: [],
      products: [],
      total: 0,
      page: ask.page ?? 1,
      pageSize: ask.pageSize ?? 1,
      sort: "relevancia",
      facets: { categories: [], options: [], discount: { count: 0, selected: false }, price: null },
      applied: [],
    }
  }

  return (await response.json()) as StorefrontCatalog
}

export async function productAt(slug: string, productSlug: string): Promise<PublicProductDetail | null> {
  const response = await callPublicApi({
    path: `/stores/${slug}/catalog/${productSlug}`,
    tags: [catalogTag(slug)],
  })

  if (!response.ok) return null

  return (await response.json()) as PublicProductDetail
}

/** How many pages a total divides into. Never zero: an empty shop still has one page to be on. */
export function pageCountOf(total: number, pageSize: number): number {
  return Math.max(1, Math.ceil(total / Math.max(pageSize, 1)))
}

/**
 * Every category the shop shows: its menu and its categories block read these.
 *
 * One product, because nothing here reads it. The catalogue endpoint answers with the categories and
 * a page of products together, and a page the landing will not draw is a page paid for twice.
 */
export async function categoriesAt(slug: string): Promise<PublicProductCategory[]> {
  return (await catalogueAt(slug, { pageSize: 1 })).categories
}
