// Next
import { notFound } from "next/navigation"
import type { Metadata } from "next"

// UI
import { StorefrontProductRail } from "@harness-monorepo/ui/blocks/storefront/storefront-product-rail"
import { StorefrontShowcase } from "@harness-monorepo/ui/blocks/storefront/storefront-showcase"

// App
import { StorefrontFrame } from "@/components/storefront/storefront-frame"
import { getMessages } from "@/lib/locale"
import { homeAt, shopAt } from "@/lib/storefront-data"
import { storefrontRoutes } from "@/lib/storefront-routes"

/**
 * A shop's front door, at its own address.
 *
 * A landing and not the catalogue: products running sideways, with a way through to the rest. The
 * grid of everything lives one click away, where it can be filtered and paged without the home
 * carrying that weight on the page most visitors ever see.
 *
 * One band or one per category is the shopkeeper's choice, and `Store.showProductsByCategory` is
 * where they made it — the checkbox has been in the panel's appearance tab all along, saving and
 * loading, while no page on the shop window read it. It defaults to off, so a shop that never
 * touched it gets the single band.
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

  const [{ ui }, home] = await Promise.all([
    getMessages(),
    homeAt(slug, store.showProductsByCategory),
  ])

  const routes = storefrontRoutes(store)
  const layout = store.layoutSettings

  // The shop's own banners, already resolved: the API built each address from the slug its target
  // has now, so renaming a category or a product moves the poster with it rather than breaking it.
  // Nothing is filtered here — a hidden banner never reaches this shape.
  const showcases = store.banners.map((banner) => ({
    id: banner.id,
    title: banner.title,
    subtitle: banner.subtitle,
    imageUrl: banner.imageUrl,
    href: banner.href,
    external: banner.external,
    layout: banner.layout,
  }))

  return (
    <StorefrontFrame
      store={store}
      categories={home.categories}
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
        The categories the shopkeeper gave a shape to, as posters — in their own order, so what runs
        here is their arrangement and not ours. A category with no shape stays off this band and is
        still in the menu, in the rails below and at its own address.
      */}
      <StorefrontShowcase items={showcases} />
      {/*
        The bands, in the shopkeeper's own order — they know what they want to sell first. A band
        with nothing available in it draws nothing: the rail returns null on an empty list, so a
        shop mid-restock is a shorter page rather than a row of empty headings.

        The copy is chosen here and not in `homeAt`: a data module that carried a heading would be
        a data module that has to be told a language.
      */}
      {home.bands.map((band) =>
        band.kind === "all" ? (
          <StorefrontProductRail
            key="all"
            products={band.products}
            productHref={routes.product}
            title={ui.storefront.catalogTitle}
            seeAllHref={routes.catalog()}
            locale="pt-BR"
            showPrice={layout.showProductPrice ?? true}
            showBadge={layout.showProductBadges ?? true}
            messages={ui}
          />
        ) : (
          <StorefrontProductRail
            key={band.category.id}
            products={band.products}
            productHref={routes.product}
            title={band.category.name}
            label={band.category.description ?? undefined}
            seeAllHref={routes.category(band.category.slug)}
            locale="pt-BR"
            showPrice={layout.showProductPrice ?? true}
            showBadge={layout.showProductBadges ?? true}
            messages={ui}
          />
        ),
      )}
    </StorefrontFrame>
  )
}
