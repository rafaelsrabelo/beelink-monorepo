// Next
import { notFound } from "next/navigation"
import type { Metadata } from "next"

// UI
import { StorefrontProductRail } from "@harness-monorepo/ui/blocks/storefront/storefront-product-rail"
import { StorefrontShowcase } from "@harness-monorepo/ui/blocks/storefront/storefront-showcase"

// App
import { StorefrontFrame } from "@/components/storefront/storefront-frame"
import { getMessages } from "@/lib/locale"
import { HOME_RAILS_MAX, RAIL_PAGE_SIZE, catalogueAt, shopAt } from "@/lib/storefront-data"
import { storefrontRoutes } from "@/lib/storefront-routes"

/**
 * A shop's front door, at its own address.
 *
 * A landing and not the catalogue: one band of products per category, each running sideways, each
 * with a way into the category it came from. The grid of everything lives one click away, where it
 * can be filtered and paged without the home carrying that weight on the page most visitors ever
 * see.
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

  // The smallest ask that still answers with every category the shop has: the catalogue endpoint
  // returns both halves together, and the home needs the list before it knows what to ask for.
  const [{ ui }, index] = await Promise.all([getMessages(), catalogueAt(slug, { pageSize: 1 })])

  const shown = index.categories.slice(0, HOME_RAILS_MAX)
  const rails = await Promise.all(
    shown.map(async (category) => ({
      category,
      products: (await catalogueAt(slug, { category: category.slug, pageSize: RAIL_PAGE_SIZE })).products,
    })),
  )

  const routes = storefrontRoutes(store)
  const layout = store.layoutSettings

  return (
    <StorefrontFrame
      store={store}
      categories={index.categories}
      // No pitch band. It used to sit right under the cover — the shop's name, a line about the
      // shop and a WhatsApp button — and the shop owner was right that it reads as a profile page
      // rather than a landing page: three lines of prose between the cover and the first thing for
      // sale. The name is in the header and the WhatsApp is in the footer and on every product.
      showBanner
      showHighlights
      year={new Date().getFullYear()}
      messages={ui}
    >
      {/*
        The page's heading, for the accessibility tree only. Dropping the pitch band dropped the
        one `h1` this page had, and a landing page whose heading is a logo is a page a screen
        reader opens with no idea whose shop it is.
      */}
      <h1 className="sr-only">{store.name}</h1>

      {/*
        What the shopkeeper put on their own landing page, before anything the catalogue generated:
        three cards with a name and a line, then two banners. They come ordered and already grouped
        by shape, so what runs here is their arrangement and not ours.
      */}
      <StorefrontShowcase items={store.showcases} />
      {/*
        One band per category, in the shopkeeper's own order — they know what they want to sell
        first. A category with nothing available in it draws nothing: the rail returns null on an
        empty list, so a shop mid-restock is a shorter page rather than a row of empty headings.
      */}
      {rails.map(({ category, products }) => (
        <StorefrontProductRail
          key={category.id}
          products={products}
          productHref={routes.product}
          title={category.name}
          label={category.description ?? undefined}
          seeAllHref={routes.category(category.slug)}
          locale="pt-BR"
          showPrice={layout.showProductPrice ?? true}
          showBadge={layout.showProductBadges ?? true}
          messages={ui}
        />
      ))}
    </StorefrontFrame>
  )
}
