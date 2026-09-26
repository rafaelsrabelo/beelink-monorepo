// Next
import { notFound } from "next/navigation"
import type { Metadata } from "next"

// App
import { StorefrontFrame } from "@/components/storefront/storefront-frame"
import { contactCopyOf } from "@/components/storefront/storefront-contact-copy"
import { StorefrontSections } from "@/components/storefront/storefront-sections"
import { orderHrefOf } from "@/components/storefront/storefront-links"
import { getMessages } from "@/lib/locale"
import { shopperAt } from "@/lib/shopper"
import { landingAt, navigationAt, shopAt } from "@/lib/storefront-data"
import { storefrontRoutes } from "@/lib/storefront-routes"

/**
 * A landing page the shopkeeper made, at `/<shop>/lp/<address>`: a launch, a sale, a collection.
 *
 * The home's twin, read the same way: the shop for its colours, its strip and its menu, and the
 * landing for its own bands, both cached under the shop's tags so a publish drops them together. A
 * draft, an archived landing and an address nobody holds are one answer — a 404 — so a crawler never
 * indexes a page the shopkeeper has not put up.
 *
 * `lp` is a static segment beside `[section]`, which the router tries first; the API reserves it so
 * no category can be shadowed by it.
 */
export async function generateMetadata({ params }: PageProps<"/[slug]/lp/[page]">): Promise<Metadata> {
  const { slug, page } = await params
  const [store, landing] = await Promise.all([shopAt(slug), landingAt(slug, page)])

  if (!store || !landing) return {}

  // The shopkeeper's words for a search result, and the page's own name beside the shop's when they wrote none.
  const title = landing.seo.title ?? `${landing.title} · ${store.name}`
  const description = landing.seo.description ?? store.description ?? undefined

  return {
    title,
    description,
    alternates: { canonical: storefrontRoutes(store).landing(landing.slug) },
    openGraph: { title, description, images: landing.seo.imageUrl ?? store.logoUrl ?? undefined, type: "website" },
  }
}

export default async function LandingPage({ params }: PageProps<"/[slug]/lp/[page]">) {
  const { slug, page } = await params
  const [store, landing] = await Promise.all([shopAt(slug), landingAt(slug, page)])

  if (!store || !landing) notFound()

  const [{ ui, web }, { categories, onSale }] = await Promise.all([
    getMessages(),
    store.type === "INSTITUTIONAL" ? { categories: [], onSale: false } : navigationAt(slug),
  ])

  const routes = storefrontRoutes(store)
  const layout = store.layoutSettings

  return (
    <StorefrontFrame
      store={store}
      categories={categories}
      onSale={onSale}
      year={new Date().getFullYear()}
      shopper={await shopperAt(slug)}
      messages={ui}
      chrome={landing.usesChrome}
      // A site's menu is the home's bands; from here they are on another page.
      anchorBase={routes.home}
      blocks={
        <>
          <h1 className="sr-only">{landing.title}</h1>
          <StorefrontSections
            sections={landing.sections}
            primary={store.colors.primary}
            categories={categories}
            routes={routes}
            showPrice={layout.showProductPrice ?? true}
            showBadge={layout.showProductBadges ?? true}
            // Without the shop's header and footer there is no cart to reach: a card that added to one
            // would say "Adicionado" and lead nowhere, so it leads to the product's page instead.
            quickAdd={landing.usesChrome && (layout.showQuickAdd ?? true)}
            contact={{ slug, whatsappHref: orderHrefOf(store) ?? null, copy: contactCopyOf(web) }}
            messages={ui}
          />
        </>
      }
    />
  )
}
