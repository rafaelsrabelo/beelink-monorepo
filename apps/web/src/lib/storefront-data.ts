// Types
import type { PublicProduct, PublicStore, StorefrontCatalog } from "@harness-monorepo/contracts"

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

/** How many products one rail asks for. A landing shows a selection, not the shop. */
export const RAIL_PAGE_SIZE = 12

/**
 * How many category rails the home will draw.
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
