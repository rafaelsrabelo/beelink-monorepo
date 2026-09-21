// Next
import { notFound } from "next/navigation"
import type { Metadata } from "next"

// UI
import { StorefrontBreadcrumb } from "@harness-monorepo/ui/blocks/storefront/storefront-breadcrumb"
import { StorefrontProductDetail } from "@harness-monorepo/ui/blocks/storefront/storefront-product"

// App
import { StorefrontFrame } from "@/components/storefront/storefront-frame"
import { getMessages } from "@/lib/locale"
import { productAt, shopAt } from "@/lib/storefront-data"
import { sectionOf, storefrontRoutes } from "@/lib/storefront-routes"

/**
 * One product, at `/<shop>/<the shop's word for products>/<product>`.
 *
 * The word is not decoration and it is not a literal. A flat `/<shop>/<product>` would make every
 * future shop-level segment a forbidden product name, and the day someone sells something called
 * "carrinho" the collision is silent and the fix is a printed flyer that no longer works. And the
 * word itself comes from the shop, so `/lessari/produtos/bolsa` and `/lessari/products/bolsa` are
 * the same page for two shops that chose differently.
 *
 * A third segment under any other word is not a product. `/lessari/blusas/bolsa` 404s rather than
 * resolving: a product belongs to a category but never nests under one, because a product moved
 * between categories would otherwise change address and break every link already shared.
 */
async function load(slug: string, section: string, productSlug: string) {
  const store = await shopAt(slug)

  if (!store) return null

  // Only the products word reaches a product. `sectionOf` is asked rather than the word compared
  // here, so the one place that knows what a segment means stays the one place.
  if (sectionOf(section, store.routeWords).kind !== "catalog") return null

  const product = await productAt(slug, productSlug)

  if (!product) return null

  return { store, product }
}

export async function generateMetadata({
  params,
}: PageProps<"/[slug]/[section]/[item]">): Promise<Metadata> {
  const { slug, section, item } = await params
  const loaded = await load(slug, section, item)

  if (!loaded) return {}

  const { store, product } = loaded

  return {
    // The shop's name after the product's: a search result reads "Bolsa Amora · Lessari", which is
    // the order someone scanning a page of results needs them in.
    title: `${product.name} · ${store.name}`,
    description: product.description ?? store.description ?? undefined,
    alternates: { canonical: storefrontRoutes(store).product(product.slug) },
    openGraph: {
      title: product.name,
      description: product.description ?? undefined,
      images: product.images[0]?.url ?? store.logoUrl ?? undefined,
      type: "website",
    },
  }
}

export default async function ProductPage({ params }: PageProps<"/[slug]/[section]/[item]">) {
  const { slug, section, item } = await params
  const loaded = await load(slug, section, item)

  if (!loaded) notFound()

  const { store, product } = loaded
  const { ui } = await getMessages()
  const routes = storefrontRoutes(store)
  const layout = store.layoutSettings

  // The message names the product, so a shopkeeper reading it on their phone knows what is being
  // asked for before they answer. Built here: a block never knows what wa.me wants.
  const order = store.socialNetworks.whatsapp?.replace(/\D/g, "")
  const orderHref = order
    ? `https://wa.me/${order}?text=${encodeURIComponent(`Olá! Tenho interesse em "${product.name}" — ${store.name}`)}`
    : undefined

  return (
    <StorefrontFrame
      store={store}
      // No category band on a product page: this page is about one thing, and a row of every
      // category above it is a row of doors out of the page someone just chose to open.
      categories={[]}
      year={new Date().getFullYear()}
      messages={ui}
    >
      {/*
        The deepest trail in the shop, and the page that needs it most: someone who arrived here
        from Google or from a WhatsApp link has no history to go back through, and this is the only
        thing on the page saying the product sits in a category inside a shop.
      */}
      <StorefrontBreadcrumb
        homeHref={routes.home}
        items={[
          { label: ui.storefront.catalogTitle, href: routes.catalog() },
          ...(product.category
            ? [{ label: product.category.name, href: routes.category(product.category.slug) }]
            : []),
          { label: product.name },
        ]}
        messages={ui}
      />

      <StorefrontProductDetail
        name={product.name}
        description={product.description}
        priceCents={product.priceCents}
        compareAtPriceCents={product.compareAtPriceCents}
        images={product.images}
        categoryName={product.category?.name ?? null}
        backHref={product.category ? routes.category(product.category.slug) : routes.catalog()}
        orderHref={orderHref}
        locale="pt-BR"
        showPrice={layout.showProductPrice ?? true}
        showBadge={layout.showProductBadges ?? true}
        messages={ui}
      />
    </StorefrontFrame>
  )
}
