// Next
import { revalidateTag } from "next/cache"

/**
 * No stale answer is served after this: the next request blocks on a fresh read rather than being
 * handed the version the shopkeeper just replaced. The profile argument is required in Next 16, and
 * the alternative — a named `cacheLife` profile such as "max" — says the opposite, keep serving the
 * old entry. `updateTag`, which Next offers for read-your-own-writes, refuses to run outside a
 * Server Action, and every write here arrives through a BFF route handler.
 */
const IMMEDIATE = { expire: 0 } as const

/** The store's own record — name, colours, address, opening hours. */
export function storeTag(slug: string): string {
  return `store:${slug}`
}

/** Everything the storefront lists — categories, products, images, prices. */
export function catalogTag(slug: string): string {
  return `catalog:${slug}`
}

/**
 * What the shop says of its offers to anyone — its first-purchase headline (`offersAt`). A tag of
 * its own beside the store's, because a coupon is part of nothing else a visitor is served: saving
 * one should not drop every paged catalogue of the shop with it.
 */
export function offersTag(slug: string): string {
  return `offers:${slug}`
}

/**
 * Drops the shop's kept headline alone: a coupon was saved, paused or switched to be shown, or an
 * order took a use of one. A promotion's write drops it too, through the store's tag it also carries.
 */
export function revalidateOffers(slug: string): void {
  revalidateTag(offersTag(slug), IMMEDIATE)
}

/**
 * Drops what the storefront has cached for one store. With `revalidateOffers`, the only caller of revalidateTag in this app:
 * every admin BFF handler calls it on a 2xx, so an invalidation that escapes costs a catalogue that
 * is stale until its revalidate window closes — never one that is stale forever.
 */
export function revalidateStore(slug: string): void {
  revalidateTag(storeTag(slug), IMMEDIATE)
  revalidateTag(catalogTag(slug), IMMEDIATE)
}
