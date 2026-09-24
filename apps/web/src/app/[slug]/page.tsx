// Next
import { notFound } from "next/navigation"
import type { Metadata } from "next"

// UI
// App
import { StorefrontFrame } from "@/components/storefront/storefront-frame"
import { contactCopyOf } from "@/components/storefront/storefront-contact-copy"
import { StorefrontSections } from "@/components/storefront/storefront-sections"
import { orderHrefOf } from "@/components/storefront/storefront-links"
import { getMessages } from "@/lib/locale"
import { navigationAt, shopAt } from "@/lib/storefront-data"
import { storefrontRoutes } from "@/lib/storefront-routes"

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

  // The shop's own name and words, not a product's: this page is indexed as the shop.
  return {
    title: store.name,
    description: store.description ?? undefined,
    alternates: { canonical: `/${slug}` },
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

  const [{ ui, web }, { categories, onSale }] = await Promise.all([
    getMessages(),
    // A site has no catalogue to ask for. The empty answer is what its page draws with anyway.
    store.type === "INSTITUTIONAL" ? { categories: [], onSale: false } : navigationAt(slug),
  ])

  const routes = storefrontRoutes(store)
  const layout = store.layoutSettings

  return (
    <StorefrontFrame
      store={store}
      categories={categories}
      onSale={onSale}
      // No pitch band. It used to sit right under the cover — the shop's name, a line about the
      // shop and a WhatsApp button — and the shop owner was right that it reads as a profile page
      // rather than a landing page: three lines of prose between the cover and the first thing for
      // sale. The name is in the header and the WhatsApp is in the footer and on every product.
      // No cover and no promises band from the frame: on this page they are blocks, and which one
      // comes first is the shopkeeper's answer rather than this file's.
      year={new Date().getFullYear()}
      messages={ui}
      blocks={
        <>
          {/*
            The page's heading, for the accessibility tree only. A landing page whose heading is a
            logo is a page a screen reader opens with no idea whose shop it is.
          */}
          <h1 className="sr-only">{store.name}</h1>
          <StorefrontSections
            sections={store.sections}
            primary={store.colors.primary}
            categories={categories}
            routes={routes}
            showPrice={layout.showProductPrice ?? true}
            showBadge={layout.showProductBadges ?? true}
            quickAdd={layout.showQuickAdd ?? true}
            contact={{ slug, whatsappHref: orderHrefOf(store) ?? null, copy: contactCopyOf(web) }}
            messages={ui}
          />
        </>
      }
    >
    </StorefrontFrame>
  )
}
