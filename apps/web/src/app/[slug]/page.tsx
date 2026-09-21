// Next
import { notFound } from "next/navigation"
import type { Metadata } from "next"

// Types
import type { PublicStore } from "@harness-monorepo/contracts"

// UI
import { StorefrontWindow } from "@harness-monorepo/ui/blocks/storefront/storefront-window"

// App
import { orderHrefOf, storefrontLinksOf } from "@/components/storefront/storefront-links"
import { getMessages } from "@/lib/locale"
import { callPublicApi } from "@/lib/public-api"
import { storeTag } from "@/lib/revalidate"

/**
 * A shop's window, at its own address.
 *
 * Anonymous by construction. `src/proxy.ts` is an allow-list and does not name this path, so no
 * session is read, nothing is redirected, and a crawler is served the same HTML a person is. It
 * goes through `callPublicApi` rather than `callApi` for the same reason: no token ever travels
 * this way, so nothing cached here can be one visitor's answer handed to the next.
 *
 * It is a dynamic segment at the root, so every static route wins over it — `/login` is the login
 * screen and not a shop called "login". The API refuses those names anyway (RESERVED_SLUGS), so
 * the two halves agree instead of relying on each other.
 */
async function shopAt(slug: string): Promise<PublicStore | null> {
  const response = await callPublicApi({ path: `/stores/${slug}/public`, tags: [storeTag(slug)] })

  if (!response.ok) return null

  return (await response.json()) as PublicStore
}

export async function generateMetadata({ params }: PageProps<"/[slug]">): Promise<Metadata> {
  const { slug } = await params
  const store = await shopAt(slug)

  if (!store) return {}

  // The shop's own name and words, not the product's: this page is indexed as the shop, and a
  // title reading "bee-link" on every one of them would put them all in one another's way.
  return {
    title: store.name,
    description: store.description ?? undefined,
    openGraph: {
      title: store.name,
      description: store.description ?? undefined,
      images: store.bannerImageUrl ?? store.logoUrl ?? undefined,
      type: "website",
    },
  }
}

export default async function StorefrontPage({ params }: PageProps<"/[slug]">) {
  const { slug } = await params
  const store = await shopAt(slug)

  // 404 and not an error page: a slug nobody claimed is a page that does not exist, and telling a
  // visitor which shop names are taken is not this page's job.
  if (!store) notFound()

  const { ui } = await getMessages()

  return (
    <StorefrontWindow
      name={store.name}
      description={store.description}
      logoUrl={store.logoUrl}
      // Only when the shopkeeper chose the banner layout. A shop that uploaded one and then went
      // back to the default is not showing it by accident.
      bannerImageUrl={store.layoutType === "BANNER" ? store.bannerImageUrl : null}
      colors={store.colors}
      links={storefrontLinksOf(store)}
      orderHref={orderHrefOf(store)}
      messages={ui}
    />
  )
}
