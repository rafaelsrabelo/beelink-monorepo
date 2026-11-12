// Next
import type { Metadata } from "next"

// App
import { shopShareOf } from "./shop-share"
import { siteOrigin } from "./site-origin"
import type { ServedShop } from "./storefront-data"
import { storefrontRoutes } from "./storefront-routes"

/**
 * What a shop's front door says of itself: the shop's own name and words, not a product's, since the
 * page is indexed as the shop. An affiliate's link draws the same door at its own address
 * (IMPULSEIA-105) and says the same, pointing the search engines at this one.
 */
export async function homeMetadataOf(store: ServedShop): Promise<Metadata> {
  const home = storefrontRoutes(store).home
  const description = store.description ?? undefined

  return {
    title: store.name,
    description,
    alternates: { canonical: home },
    openGraph: shopShareOf(store, { origin: await siteOrigin(), path: home, title: store.name, description }),
  }
}
