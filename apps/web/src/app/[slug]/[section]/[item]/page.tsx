// Next
import { notFound } from "next/navigation"
import type { Metadata } from "next"

// UI
import { StorefrontBreadcrumb } from "@harness-monorepo/ui/blocks/storefront/storefront-breadcrumb"
import { plainTextOf } from "@harness-monorepo/ui/lib/markdown"
import { ORDER_VARIANT_MARK } from "@harness-monorepo/ui/lib/variant-choice"

// App
import { StorefrontFrame } from "@/components/storefront/storefront-frame"
import { StorefrontProductLive } from "@/components/storefront/storefront-product-live"
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
    // The words alone: the description is Markdown at rest, and a search result showing `**` is
    // a search result nobody clicks.
    description: descriptionOf(product.description) ?? store.description ?? undefined,
    alternates: { canonical: storefrontRoutes(store).product(product.slug) },
    openGraph: {
      title: product.name,
      description: descriptionOf(product.description),
      images: product.images[0]?.url ?? store.logoUrl ?? undefined,
      type: "website",
    },
  }
}

/** Cut where a search result cuts, on a word, so the tail is never half a sentence. */
const DESCRIPTION_MAX_LENGTH = 160

function descriptionOf(markdown: string | null): string | undefined {
  if (!markdown) return undefined
  const text = plainTextOf(markdown)
  if (text.length <= DESCRIPTION_MAX_LENGTH) return text || undefined
  return `${text.slice(0, DESCRIPTION_MAX_LENGTH).replace(/\s+\S*$/, "")}…`
}

export default async function ProductPage({ params, searchParams }: PageProps<"/[slug]/[section]/[item]">) {
  const { slug, section, item } = await params
  // Read here and not in the browser, so a shared link opens on its combination with no flash.
  const { variant } = await searchParams
  const loaded = await load(slug, section, item)

  if (!loaded) notFound()

  const { store, product } = loaded
  const { ui, web } = await getMessages()
  const routes = storefrontRoutes(store)
  const layout = store.layoutSettings

  // The message names the product and the combination chosen, so a shopkeeper reading it on their
  // phone knows what is being asked for before they answer. Built here: a block never knows what
  // wa.me wants, and puts the combination where the mark is.
  const order = store.socialNetworks.whatsapp?.replace(/\D/g, "")
  const orderHref = order
    ? `https://wa.me/${order}?text=${encodeURIComponent(`Olá! Tenho interesse em "${product.name}"`)}${ORDER_VARIANT_MARK}${encodeURIComponent(` — ${store.name}`)}`
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
        // Início › category › product, as the design draws it. The catalogue crumb stands in only
        // for a product filed under no category, which otherwise would hang straight off the door.
        items={[
          product.category
            ? { label: product.category.name, href: routes.category(product.category.slug) }
            : { label: ui.storefront.catalogTitle, href: routes.catalog() },
          { label: product.name },
        ]}
        messages={ui}
      />

      <StorefrontProductLive
        slug={slug}
        product={product}
        initialVariantId={typeof variant === "string" ? variant : null}
        orderHref={orderHref}
        showPrice={layout.showProductPrice ?? true}
        showBadge={layout.showProductBadges ?? true}
        restockCopy={{
          RESTOCK_VARIANT_INVALID: web.errors.RESTOCK_VARIANT_INVALID,
          BAD_REQUEST: ui.validation.whatsappInvalid,
          RATE_LIMITED: web.errors.RATE_LIMITED,
          UNKNOWN: web.errors.UNKNOWN,
        }}
        messages={ui}
      />
    </StorefrontFrame>
  )
}
