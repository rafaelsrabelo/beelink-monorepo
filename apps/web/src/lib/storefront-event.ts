// Types
import type { PublicStore } from "@harness-monorepo/contracts"

/**
 * What a visitor did at a shop, as the shop window tells it (BEELINK-272): the facts of the shop —
 * a product, a price in whole cents, a quantity — and nothing of any third party's. Who receives an
 * event, and under which names, is decided where it is dispatched (`storefront-track.ts`).
 *
 * The names are the ones advertising tools agree on, so a later ticket adds a line here rather than
 * a vocabulary: X6 adds `Purchase`.
 */
export type StorefrontEvent =
  | { name: "PageView" }
  | { name: "ViewContent"; product: EventProduct & { name: string; priceCents: number; category: string | null } }
  | { name: "Search"; term: string }
  | { name: "AddToWishlist"; product: EventProduct }
  | { name: "AddToCart"; item: EventItem & { name: string } }
  | { name: "InitiateCheckout"; items: readonly EventItem[]; valueCents: number }
  | { name: "AddPaymentInfo"; items: readonly EventItem[]; valueCents: number }

export type StorefrontEventName = StorefrontEvent["name"]

/** A product as an event names it: by its own id, never a combination's — the one key every event of a product shares. */
export interface EventProduct {
  id: string
  /** Absent where the button knows only the id: a like made on the way back from signing in. */
  name?: string
  priceCents?: number
}

/** Some units of a product, at what one costs now. */
export interface EventItem {
  productId: string
  unitPriceCents: number
  qty: number
}

export interface TrackOptions {
  /**
   * The event's own id, for one that is also told from the server and must be counted once: an
   * order's `purchase-<order id>`. Absent, each event gets a fresh one.
   */
  id?: string
}

/** The storefront's one way of saying something happened. It never throws and returns nothing: a page works the same told or untold. */
export type Track = (event: StorefrontEvent, options?: TrackOptions) => void

/**
 * The shop's pages no event may leave from: the ones whose address carries a single-use token —
 * confirming an e-mail, setting a password. A tracker sends the page's address with whatever it is
 * told, so on these it is told nothing, a page view included.
 */
export function quietPathsOf(store: Pick<PublicStore, "slug" | "routeWords">): string[] {
  return [store.routeWords.verifyEmail, store.routeWords.resetPassword].filter((word): word is string => Boolean(word)).map((word) => `/${store.slug}/${word}`)
}

export function isQuietPath(pathname: string, quietPaths: readonly string[]): boolean {
  return quietPaths.some((path) => pathname === path || pathname.startsWith(`${path}/`))
}

/** A fresh id for one event, which is what lets the same event told twice be counted once. */
export function newEventId(): string {
  return crypto.randomUUID()
}
