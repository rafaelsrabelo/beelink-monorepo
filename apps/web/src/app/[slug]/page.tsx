// Next
import { notFound } from "next/navigation"
import type { Metadata } from "next"

// UI
import { StorefrontCategoryGrid } from "@harness-monorepo/ui/blocks/storefront/storefront-category-grid"
import { StorefrontProductRail } from "@harness-monorepo/ui/blocks/storefront/storefront-product-rail"
import { StorefrontSection } from "@harness-monorepo/ui/blocks/storefront/storefront-section"

// App
import { StorefrontFrame } from "@/components/storefront/storefront-frame"
import { getMessages } from "@/lib/locale"
import { RAIL_PAGE_SIZE, catalogueAt, shopAt } from "@/lib/storefront-data"
import { storefrontRoutes } from "@/lib/storefront-routes"

/**
 * A shop's front door, at its own address.
 *
 * A landing and not the catalogue. It shows the shop's categories, a band of products running
 * sideways, and a way through to everything — the shape of every Brazilian shop this was measured
 * against, and what the shop owner asked for by name. The grid of everything lives one click away,
 * at the catalogue, where it can be filtered and paged without the home carrying that weight on
 * the one page most visitors ever see.
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

  const [{ ui }, catalogue] = await Promise.all([
    getMessages(),
    // Only what the rail shows. A home that asked for the whole catalogue and sliced it here would
    // put every product a shop has into the HTML of its most visited address.
    catalogueAt(slug, { pageSize: RAIL_PAGE_SIZE }),
  ])

  const routes = storefrontRoutes(store)
  const layout = store.layoutSettings

  return (
    <StorefrontFrame
      store={store}
      categories={catalogue.categories}
      // The pitch and the cover are the home's alone: an inner page is about the goods, and
      // repeating the shop's paragraph above them pushes what someone came for below the fold.
      description={store.description}
      showBanner
      showHighlights
      year={new Date().getFullYear()}
      messages={ui}
    >
      {/*
        The rail carries its own heading and its own "see all", because a scrollable region has to
        be named after the band it is. Wrapping it in a StorefrontSection would put the same words
        in a second heading directly above it.
      */}
      <StorefrontProductRail
        products={catalogue.products}
        productHref={routes.product}
        seeAllHref={routes.catalog()}
        label={ui.storefront.featuredEyebrow}
        locale="pt-BR"
        showPrice={layout.showProductPrice ?? true}
        showBadge={layout.showProductBadges ?? true}
        messages={ui}
      />

      {/*
        h2, like the rail's own heading. The shop's name in band 5 is this page's h1 and these two
        bands are its peers; axe cannot see a broken outline — every heading is valid on its own —
        so the level is the page's decision and is made here, once.
      */}
      {catalogue.categories.length ? (
        <StorefrontSection
          title={ui.storefront.categoriesTitle}
          label={ui.storefront.categoriesEyebrow}
          moreHref={routes.categories()}
          headingLevel={2}
          messages={ui}
        >
          <StorefrontCategoryGrid
            categories={catalogue.categories}
            href={routes.category}
            catalogHref={routes.catalog()}
            locale="pt-BR"
            messages={ui}
          />
        </StorefrontSection>
      ) : null}
    </StorefrontFrame>
  )
}
