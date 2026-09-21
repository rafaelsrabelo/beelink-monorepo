// Next
import { notFound } from "next/navigation"
import type { Metadata } from "next"

// Types
import type { PublicProductCard, PublicProductCategory, PublicStore } from "@harness-monorepo/contracts"

// UI
import { StorefrontCatalog } from "@harness-monorepo/ui/blocks/storefront/storefront-catalog"
import { StorefrontCategories } from "@harness-monorepo/ui/blocks/storefront/storefront-categories"
import { StorefrontWindow } from "@harness-monorepo/ui/blocks/storefront/storefront-window"

// App
import { addressLineOf, orderHrefOf, storefrontLinksOf } from "@/components/storefront/storefront-links"
import { getMessages } from "@/lib/locale"
import { callPublicApi } from "@/lib/public-api"
import { catalogTag, storeTag } from "@/lib/revalidate"

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

interface Catalogue {
  categories: PublicProductCategory[]
  products: PublicProductCard[]
}

/**
 * The catalogue, filtered as the address asks. Under `catalogTag` and not `storeTag`: a price
 * change should not drop the shop's colours from the cache, and a colour change should not drop
 * every filtered catalogue page with it.
 */
async function catalogueAt(slug: string, category?: string, search?: string): Promise<Catalogue> {
  const query = new URLSearchParams()
  if (category) query.set("categoria", category)
  if (search) query.set("busca", search)
  const suffix = query.size ? `?${query.toString()}` : ""

  const response = await callPublicApi({
    path: `/stores/${slug}/catalog${suffix}`,
    tags: [catalogTag(slug)],
  })

  // A catalogue that would not load is an empty shelf, never a broken page: the shop's name, its
  // description and its WhatsApp are worth serving on their own.
  if (!response.ok) return { categories: [], products: [] }

  return (await response.json()) as Catalogue

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

export default async function StorefrontPage({ params, searchParams }: PageProps<"/[slug]">) {
  const { slug } = await params
  const { categoria, busca } = await searchParams
  const category = typeof categoria === "string" ? categoria : undefined
  const search = typeof busca === "string" ? busca : undefined

  const store = await shopAt(slug)

  // 404 and not an error page: a slug nobody claimed is a page that does not exist, and telling a
  // visitor which shop names are taken is not this page's job.
  if (!store) notFound()

  const [{ ui }, catalogue] = await Promise.all([getMessages(), catalogueAt(slug, category, search)])
  const layout = store.layoutSettings

  const categoryHref = (next: string | null) =>
    next ? `/${slug}?categoria=${encodeURIComponent(next)}` : `/${slug}`

  return (
    <StorefrontWindow
      name={store.name}
      description={store.description}
      logoUrl={store.logoUrl}
      homeHref={`/${slug}`}
      colors={store.colors}
      searchAction={`/${slug}`}
      searchValue={search ?? ""}
      // The open category travels with a search: filtering and then searching should narrow, not
      // start over.
      searchHidden={category ? { categoria: category } : undefined}
      categories={
        <StorefrontCategories
          categories={catalogue.categories}
          active={category ?? null}
          href={categoryHref}
          withImages={layout.showCategoryIcons ?? true}
        />
      }
      // Only when the shopkeeper chose the banner layout. A shop that uploaded one and then went
      // back to the default is not showing it by accident.
      banner={
        store.layoutType === "BANNER" && store.bannerImageUrl
          ? { imageUrl: store.bannerImageUrl }
          : null
      }
      links={storefrontLinksOf(store)}
      orderHref={orderHrefOf(store)}
      addressLine={addressLineOf(store)}
      messages={ui}
    >
      <StorefrontCatalog
        products={catalogue.products}
        productHref={(productSlug) => `/${slug}/produtos/${productSlug}`}
        clearHref={category || search ? `/${slug}` : undefined}
        locale="pt-BR"
        productsPerRow={layout.productsPerRow ?? 3}
        showPrice={layout.showProductPrice ?? true}
        showBadge={layout.showProductBadges ?? true}
        messages={ui}
      />
    </StorefrontWindow>
  )
}
