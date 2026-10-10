// Next
import { headers } from "next/headers"

// Types
import type { CustomerSignInOptions, PublicLanding, StorefrontOffers, PublicProductCategory, PublicProductDetail, PublicProductReviews, PublicReviewListQuery, PublicStore, StorefrontCartProducts, StorefrontCatalog, StorefrontPaymentOptions, StorefrontSort } from "@harness-monorepo/contracts"

// App
import { callPublicApi } from "./public-api"
import { catalogTag, offersTag, storeTag } from "./revalidate"
import { shopAddressOf } from "./shop-address"

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
 * A shop as one request is served it: what the API says of it to anyone, and whether this request
 * arrived by the shop's own domain (BEELINK-283) — which is what `storefrontRoutes(store)` reads to
 * leave the slug out of every address.
 */
export interface ServedShop extends PublicStore {
  ownDomain: boolean
}

/**
 * The shop and every showcase on its landing, cards included.
 *
 * Under both tags: the showcases' prices and pictures ride on this read, so a product write has to
 * drop it as surely as a colour change does. `revalidateStore` drops the two together today; the
 * second tag is what keeps this right the day something drops only the catalogue.
 *
 * Where the request arrived is added after the kept read, never inside it: the answer is one for
 * every visitor, and the same shop is read from the platform's host and from its own domain. It is
 * the proxy's word, stamped on the request, and it counts only for the shop it names.
 */
export async function shopAt(slug: string): Promise<ServedShop | null> {
  const response = await callPublicApi({ path: `/stores/${slug}/public`, tags: [storeTag(slug), catalogTag(slug)] })

  if (!response.ok) return null

  const store = (await response.json()) as PublicStore
  return { ...store, ownDomain: shopAddressOf(await headers(), store.slug).ownDomain === true }
}

/** The checkout of before anything was charged online: the shop's own labels, settled with it. */
export const NO_ONLINE_PAYMENTS: StorefrontPaymentOptions = { online: null, offline: true }

/**
 * How the shop's checkout is paid (BEELINK-205): what it charges online now, and whether paying on
 * delivery stands. Under `storeTag`: the panel's handlers that connect, disconnect and save the
 * Asaas choices drop it, and so does the one that asks Asaas again whether the account is approved
 * (BEELINK-278). A shop whose key Asaas refused, or whose account the API's daily look found
 * approved or no longer, changes with no write from the panel — the answer kept is then wrong until
 * its minute closes, and an order placed in it is refused by the API, which is what makes the page
 * read again.
 *
 * A read that failed is the checkout of before: a shop must not stop selling because this did not answer.
 */
export async function paymentOptionsAt(slug: string): Promise<StorefrontPaymentOptions> {
  const response = await callPublicApi({ path: `/stores/${slug}/payment-options`, tags: [storeTag(slug)] }).catch(() => null)
  if (!response?.ok) return NO_ONLINE_PAYMENTS
  return (await response.json()) as StorefrontPaymentOptions
}

/** A shop with nothing to say for a first purchase — and what a read that failed is taken for. */
export const NO_OFFERS: StorefrontOffers = { firstPurchase: null, popup: null }

/**
 * What the shop says of its offers to anyone: its benefit for a first purchase, without any code.
 * The strip under the header words its invitation from it, and a signed-in shopper's own offers are
 * asked for only when it says there is something.
 *
 * Under the store's tag — a promotion's write drops it (`revalidateStore`) — and under its own,
 * which a coupon's write drops alone (`revalidateOffers`). A benefit that starts or ends by the
 * clock is no write: its instant travels on the answer, and `callPublicApi` asks again past it.
 *
 * A read that failed is no offer: the strip then invites plainly, and promises nothing.
 */
export async function offersAt(slug: string): Promise<StorefrontOffers> {
  const response = await callPublicApi({ path: `/stores/${slug}/offers`, tags: [storeTag(slug), offersTag(slug)] }).catch(() => null)
  if (!response?.ok) return NO_OFFERS
  const offers = (await response.json()) as StorefrontOffers
  // An answer kept from before the pop-up existed has no such key, and that is no pop-up. One kept
  // from before its reminder could be switched (BEELINK-310) has no `keepReminder`: none is kept, as
  // a pop-up that never chose reads (BEELINK-311).
  return { ...offers, popup: offers.popup ? { ...offers.popup, keepReminder: offers.popup.keepReminder ?? false } : null }
}

export interface CatalogueAsk {
  category?: string
  search?: string
  page?: number
  pageSize?: number
  sort?: StorefrontSort
  /** Whole reais, as `listingFiltersOf` reads them; the API parses an integer and refuses the rest. */
  priceMin?: number
  priceMax?: number
  discount?: boolean
  discountMinPercent?: number
  /** `Nome:Valor`, one entry per value, sent as a repeated `opcao`. */
  options?: readonly string[]
}

/**
 * How a shopper may sign in besides e-mail and password — Google, when the API has it set up. Asked
 * of the API rather than repeated here: the setup is the API's, and one place decides it.
 */
export async function signInOptionsAt(): Promise<CustomerSignInOptions> {
  const response = await callPublicApi({ path: "/customer/sign-in-options", revalidate: 300 }).catch(() => null)
  if (!response?.ok) return { google: false, platformOrigin: "" }
  return (await response.json()) as CustomerSignInOptions
}

/**
 * A shelf as this app reads it: the catalogue, and whether it could be read at all. Not a wire shape —
 * the API never sends `failed`; this module sets it when the API could not answer.
 */
export type StorefrontShelf = StorefrontCatalog & { failed?: true }

/**
 * The catalogue, filtered and paged as the address asks.
 *
 * Under `catalogTag` and not `storeTag`: a price change should not drop the shop's colours from the
 * cache, and a colour change should not drop every paged catalogue with it.
 */
export async function catalogueAt(slug: string, ask: CatalogueAsk = {}): Promise<StorefrontShelf> {
  const query = new URLSearchParams()
  if (ask.category) query.set("categoria", ask.category)
  if (ask.search) query.set("busca", ask.search)
  if (ask.page && ask.page > 1) query.set("pagina", String(ask.page))
  if (ask.pageSize) query.set("porPagina", String(ask.pageSize))
  if (ask.sort && ask.sort !== "relevancia") query.set("ordenar", ask.sort)
  // Whole reais, or the API answers 400 and this page would say "nothing found" for a typo.
  if (ask.priceMin !== undefined && Number.isFinite(ask.priceMin)) query.set("precoMin", String(Math.max(0, Math.floor(ask.priceMin))))
  if (ask.priceMax !== undefined && Number.isFinite(ask.priceMax)) query.set("precoMax", String(Math.max(0, Math.ceil(ask.priceMax))))
  if (ask.discountMinPercent && ask.discountMinPercent > 1) query.set("desconto", String(Math.floor(ask.discountMinPercent)))
  else if (ask.discount) query.set("desconto", "1")
  for (const option of ask.options ?? []) query.append("opcao", option)

  const suffix = query.size ? `?${query.toString()}` : ""

  // A request that never reached the API throws; it is the same outage as a 500, not a broken page.
  const response = await callPublicApi({
    path: `/stores/${slug}/catalog${suffix}`,
    tags: [catalogTag(slug)],
  }).catch(() => null)

  // A catalogue that would not load is an empty shelf, never a broken page: the shop's name, its
  // description and its WhatsApp are worth serving on their own. `pageSize` is echoed as asked so
  // the pager divides by something rather than by zero. A 400 is a filter the API refused, which
  // reads as "nothing found"; an outage is `failed`, so the shelf can say so and offer to try again.
  if (!response?.ok) {
    return {
      ...(!response || response.status >= 500 ? { failed: true as const } : {}),
      categories: [],
      products: [],
      total: 0,
      page: ask.page ?? 1,
      pageSize: ask.pageSize ?? 1,
      sort: "relevancia",
      facets: { categories: [], options: [], discount: { count: 0, selected: false, ranges: [] }, price: null },
      applied: [],
    }
  }

  return (await response.json()) as StorefrontCatalog
}

/**
 * A published landing, at `/<shop>/lp/<address>`. A draft, an archived one and an address nobody
 * holds are all null — the page is a 404, which is what a crawler has to hear.
 *
 * Under both tags, like the shop: its showcases carry prices, and its bands are dropped by the same
 * writes that drop the home's. An address that could not be one is not sent at all: the segment
 * arrives decoded, and `..` in it would be a path on the API.
 */
export async function landingAt(slug: string, pageSlug: string): Promise<PublicLanding | null> {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(pageSlug)) return null

  const response = await callPublicApi({
    path: `/stores/${slug}/landings/${pageSlug}`,
    tags: [storeTag(slug), catalogTag(slug)],
  }).catch(() => null)

  if (!response?.ok) return null

  return (await response.json()) as PublicLanding
}

export async function productAt(slug: string, productSlug: string): Promise<PublicProductDetail | null> {
  const response = await callPublicApi({
    path: `/stores/${slug}/catalog/${productSlug}`,
    tags: [catalogTag(slug)],
  })

  if (!response.ok) return null

  return (await response.json()) as PublicProductDetail
}

/**
 * A product's published reviews — the summary and a page — under the catalogue's tag, which a hide in
 * the panel drops (`revalidateStore`). Null when they could not be read: the section is the page's
 * last, and a failure there never takes the product with it.
 */
export async function productReviewsAt(slug: string, productId: string, query: PublicReviewListQuery = {}): Promise<PublicProductReviews | null> {
  const search = new URLSearchParams(Object.entries(query).flatMap(([key, value]) => (value === undefined ? [] : [[key, String(value)]])))
  const response = await callPublicApi({
    path: `/stores/${slug}/products/${encodeURIComponent(productId)}/reviews${search.size ? `?${search.toString()}` : ""}`,
    tags: [catalogTag(slug)],
  }).catch(() => null)

  return response?.ok ? ((await response.json()) as PublicProductReviews) : null
}

/** How many pages a total divides into. Never zero: an empty shop still has one page to be on. */
export function pageCountOf(total: number, pageSize: number): number {
  return Math.max(1, Math.ceil(total / Math.max(pageSize, 1)))
}

/** What the shop's menu is drawn from, and nothing a page will not draw. */
export interface ShopNavigation {
  categories: PublicProductCategory[]
  /** Whether the shop has anything on sale: the menu's "Ofertas do dia" is drawn only then. */
  onSale: boolean
  /** The read failed: an empty menu here is an outage, not a shop without categories. */
  failed?: true
}

/**
 * The shop's menu: every category it shows, and whether it has anything on sale.
 *
 * One product, because nothing here reads it. The catalogue endpoint answers with the categories, the
 * facets and a page of products together, and a page the landing will not draw is a page paid for
 * twice — so the discount's count rides on the same read rather than costing a second one.
 */
export async function navigationAt(slug: string): Promise<ShopNavigation> {
  const catalogue = await catalogueAt(slug, { pageSize: 1 })
  return { categories: catalogue.categories, onSale: catalogue.facets.discount.count > 0, ...(catalogue.failed ? { failed: true as const } : {}) }
}

/** Every category the shop shows: its categories block reads these. */
export async function categoriesAt(slug: string): Promise<PublicProductCategory[]> {
  return (await navigationAt(slug)).categories
}

/**
 * The products a cart names, as their pages show them. Cached like the rest of the catalogue and
 * keyed by the ids, which are the same answer for anyone who asks — the cart itself never leaves
 * the visitor's cookie. An empty cart asks nothing.
 */
export async function cartProductsAt(slug: string, productIds: readonly string[]): Promise<PublicProductDetail[]> {
  const ids = [...new Set(productIds)].sort()
  if (!ids.length) return []

  const query = new URLSearchParams(ids.map((id) => ["produto", id]))
  const response = await callPublicApi({ path: `/stores/${slug}/cart?${query.toString()}`, tags: [catalogTag(slug)] })

  if (!response.ok) return []

  return ((await response.json()) as StorefrontCartProducts).products
}
