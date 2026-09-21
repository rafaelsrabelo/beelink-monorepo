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
 * Drops what the storefront has cached for one store. The only caller of revalidateTag in this app:
 * every admin BFF handler calls it on a 2xx, so an invalidation that escapes costs a catalogue that
 * is stale until its revalidate window closes — never one that is stale forever.
 */
export function revalidateStore(slug: string): void {
  revalidateTag(storeTag(slug), IMMEDIATE)
  revalidateTag(catalogTag(slug), IMMEDIATE)
}
