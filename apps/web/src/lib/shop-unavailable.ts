// Next
import type { Metadata } from "next"

// Types
import type { PublicStore, StorefrontRouteWords } from "@harness-monorepo/contracts"

// App
import { sectionOf } from "./storefront-routes"

/*
  A shop window off the air (BEELINK-223): the API says so on the shop's own read, `unavailable`,
  while its page is locked for want of payment. What sells is off the air with it; a customer's own
  pages — the account, signing in, the orders — are not, and the API still answers them.
*/

/** The sections a customer's own pages live under. */
const THEIRS: ReadonlySet<string> = new Set(["account", "signIn", "verifyEmail", "resetPassword"])

/** Whether the shop's page at this second segment is off the air while the shop is unavailable: all but a customer's own. */
export function offTheAirAt(segment: string, routeWords: StorefrontRouteWords): boolean {
  return !THEIRS.has(sectionOf(segment, routeWords).kind)
}

/**
 * What a page off the air tells a browser and a crawler: the shop's name, and that it is nobody's
 * search result — indexed, "unavailable" would stand where the shop was.
 */
export function unavailableMetadata(store: Pick<PublicStore, "name">): Metadata {
  return { title: store.name, robots: { index: false, follow: false } }
}
