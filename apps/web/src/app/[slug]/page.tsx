// Next
import { notFound } from "next/navigation"
import type { Metadata } from "next"

// App
import { ShopUnavailable } from "@/components/storefront/shop-unavailable"
import { StorefrontHome } from "@/components/storefront/storefront-home"
import { getMessages } from "@/lib/locale"
import { homeMetadataOf } from "@/lib/shop-home-metadata"
import { unavailableMetadata } from "@/lib/shop-unavailable"
import { shopAt } from "@/lib/storefront-data"

/**
 * A shop's front door, at its own address.
 *
 * A landing and not the catalogue: the showcases the shopkeeper arranged, each with a way through to
 * the rest. The grid of everything lives one click away, where it can be filtered and paged without
 * the home carrying that weight on the page most visitors ever see. Each showcase's products come
 * resolved inside the shop's own read, so the landing costs that read and the categories — never a
 * read per shelf.
 *
 * It shows no index of categories. It used to, and the shop owner was right that it was repeating
 * itself — every category is already named in the band under the header, so a grid of the same
 * names underneath is the same navigation twice and neither copy shows a single thing for sale.
 * What a category is worth on a landing page is what is inside it.
 *
 * Nothing here filters. A search goes to the search page and a category to its own address, so
 * every view a visitor can reach is a page they can bookmark, share, and be sent to by Google.
 *
 * Anonymous by construction. `src/proxy.ts` is an allow-list and does not name this path, so no
 * session is read and a crawler is served the same HTML a person is.
 */
export async function generateMetadata({ params }: PageProps<"/[slug]">): Promise<Metadata> {
  const { slug } = await params
  const store = await shopAt(slug)

  if (!store) return {}
  if (store.unavailable) return unavailableMetadata(store)

  return homeMetadataOf(store)
}

export default async function StorefrontPage({ params }: PageProps<"/[slug]">) {
  const { slug } = await params
  const store = await shopAt(slug)

  // 404 and not an error page: a slug nobody claimed is a page that does not exist, and telling a
  // visitor which shop names are taken is not this page's job.
  if (!store) notFound()
  // Its page stopped paying (BEELINK-223): nothing of the catalogue is asked for, and nothing is sold.
  if (store.unavailable) return <ShopUnavailable store={store} messages={(await getMessages()).ui} />

  return <StorefrontHome slug={slug} store={store} />
}
