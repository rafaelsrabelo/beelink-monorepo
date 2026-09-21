// Next
import { notFound } from "next/navigation"
import type { Metadata } from "next"

// Types
import type { PublicProduct, PublicStore } from "@harness-monorepo/contracts"

// UI
import { StorefrontProductDetail } from "@harness-monorepo/ui/blocks/storefront/storefront-product"
import { StorefrontWindow } from "@harness-monorepo/ui/blocks/storefront/storefront-window"

// App
import { addressLineOf, orderHrefOf, storefrontLinksOf } from "@/components/storefront/storefront-links"
import { getMessages } from "@/lib/locale"
import { callPublicApi } from "@/lib/public-api"
import { catalogTag, storeTag } from "@/lib/revalidate"

/**
 * One product, at `/<shop>/produtos/<product>`.
 *
 * The `produtos` segment is not decoration. A flat `/<shop>/<product>` would make every future
 * shop-level segment a forbidden product name, and the day someone sells something called
 * "carrinho" the collision is silent and the fix is a printed flyer that no longer works.
 */
async function load(slug: string, productSlug: string) {
  const [storeResponse, productResponse] = await Promise.all([
    callPublicApi({ path: `/stores/${slug}/public`, tags: [storeTag(slug)] }),
    callPublicApi({ path: `/stores/${slug}/catalog/${productSlug}`, tags: [catalogTag(slug)] }),
  ])

  if (!storeResponse.ok || !productResponse.ok) return null

  return {
    store: (await storeResponse.json()) as PublicStore,
    product: (await productResponse.json()) as PublicProduct,
  }
}

export async function generateMetadata({ params }: PageProps<"/[slug]/produtos/[productSlug]">): Promise<Metadata> {
  const { slug, productSlug } = await params
  const loaded = await load(slug, productSlug)

  if (!loaded) return {}

  return {
    // The shop's name after the product's: a search result reads "Bolsa Amora · Lessari", which
    // is the order someone scanning a page of results needs them in.
    title: `${loaded.product.name} · ${loaded.store.name}`,
    description: loaded.product.description ?? loaded.store.description ?? undefined,
    openGraph: {
      title: loaded.product.name,
      description: loaded.product.description ?? undefined,
      images: loaded.product.images[0]?.url ?? loaded.store.logoUrl ?? undefined,
      type: "website",
    },
  }
}

export default async function ProductPage({ params }: PageProps<"/[slug]/produtos/[productSlug]">) {
  const { slug, productSlug } = await params
  const loaded = await load(slug, productSlug)

  if (!loaded) notFound()

  const { store, product } = loaded
  const { ui } = await getMessages()
  const layout = store.layoutSettings

  // The message names the product, so a shopkeeper reading it on their phone knows what is being
  // asked for before they answer. Built here: a block never knows what wa.me wants.
  const order = orderHrefOf(store)
  const orderHref = order
    ? `${order}?text=${encodeURIComponent(`Olá! Tenho interesse em "${product.name}" — ${store.name}`)}`
    : undefined

  return (
    <StorefrontWindow
      name={store.name}
      // No description and no cover here: this page is about one product, and repeating the
      // shop's pitch above it pushes the thing someone came to see below the fold.
      description={null}
      logoUrl={store.logoUrl}
      homeHref={`/${slug}`}
      colors={store.colors}
      searchAction={`/${slug}`}
      links={storefrontLinksOf(store)}
      addressLine={addressLineOf(store)}
      messages={ui}
    >
      <StorefrontProductDetail
        name={product.name}
        description={product.description}
        priceCents={product.priceCents}
        compareAtPriceCents={product.compareAtPriceCents}
        images={product.images}
        categoryName={product.category?.name ?? null}
        backHref={product.category ? `/${slug}?categoria=${encodeURIComponent(product.category.slug)}` : `/${slug}`}
        orderHref={orderHref}
        locale="pt-BR"
        showPrice={layout.showProductPrice ?? true}
        showBadge={layout.showProductBadges ?? true}
        messages={ui}
      />
    </StorefrontWindow>
  )
}
