// React
import { Suspense } from "react"

// Next
import { notFound, redirect } from "next/navigation"
import type { Metadata } from "next"

// UI
import { StorefrontCategoryGrid } from "@harness-monorepo/ui/blocks/storefront/storefront-category-grid"
import { StorefrontListingSkeleton } from "@harness-monorepo/ui/blocks/storefront/storefront-listing-skeleton"

// App
import { StorefrontFrame } from "@/components/storefront/storefront-frame"
import { StorefrontCartLive } from "@/components/storefront/storefront-cart-live"
import { StorefrontListing } from "@/components/storefront/storefront-listing"
import { StorefrontAccountSection } from "@/components/storefront/storefront-account-section"
import { StorefrontSectionBand } from "@/components/storefront/storefront-section-band"
import { StorefrontSignInSection } from "@/components/storefront/storefront-sign-in-section"
import { getMessages } from "@/lib/locale"
import { cartAt } from "@/lib/cart"
import { shopperAt } from "@/lib/shopper"
import { catalogueAt } from "@/lib/storefront-data"
import { BACK_KEY, storefrontRoutes } from "@/lib/storefront-routes"
import { canonicalOf, headingOf, isShelf, listingAskOf, placeOf } from "@/lib/storefront-section"
import { filterCountOf } from "@/lib/storefront-filters"

/**
 * The second segment of a shop's URL, whatever it turned out to mean.
 *
 * One dynamic segment and not four static folders, because the words are the shopkeeper's: a
 * PT_BR shop answers at `/lessari/produtos` and an EN one at `/lessari/products`, and Next's router
 * takes its folder names from the repository rather than from a column. So the segment arrives raw
 * and `sectionOf` decides — a route word first, a category only if it is none of them.
 *
 * That order is the contract, and the API keeps its half: it refuses `produtos` and `categorias` as
 * category slugs, so a shopkeeper cannot save a category this page would never be able to open.
 *
 * Where it is gets decided before anything streams, and the products are what stream. A
 * `loading.tsx` here would start the response before `notFound()` could run, and every address that
 * does not exist would answer 200 with a `noindex` instead of the 404 it is — so the wait is a
 * Suspense boundary around the shelf alone, under a header and a menu that are already drawn.
 */

export async function generateMetadata({ params, searchParams }: PageProps<"/[slug]/[section]">): Promise<Metadata> {
  const { slug, section } = await params
  const place = await placeOf(slug, section, await searchParams)

  if (!place) return {}

  return {
    title: `${headingOf(place)} · ${place.store.name}`,
    description: place.store.description ?? undefined,
    alternates: { canonical: canonicalOf(place, storefrontRoutes(place.store)) },
    // A paged or searched shelf is not a landing page; it is the same shelf, reached differently. Nor
    // is a deep combination of filters: three narrowings of one shelf are not a page of their own.
    robots:
      place.page > 1 || place.term || filterCountOf(place) >= 3 || ["cart", "signIn", "account"].includes(place.section.kind)
        ? { index: false, follow: true }
        : undefined,
  }
}

export default async function StorefrontSectionPage({ params, searchParams }: PageProps<"/[slug]/[section]">) {
  const { slug, section } = await params
  const query = await searchParams
  const place = await placeOf(slug, section, query)

  if (!place) notFound()

  const { store, category, navigation, messages: ui, scope } = place
  const routes = storefrontRoutes(store)
  const locale = "pt-BR"
  // 5a's four across; the shop's own choice, when it has made one, wins.
  const productsPerRow = store.layoutSettings.productsPerRow ?? 4
  // Asked once, awaited twice: by the band's count and by the grid, each under its own boundary.
  const catalogue = isShelf(place) ? catalogueAt(store.slug, listingAskOf(place)) : undefined
  // The basket: its lines from the cookie, priced by the catalogue, so the HTML already has them.
  const cart = place.section.kind === "cart" ? await cartAt(store.slug) : null
  const shopper = await shopperAt(store.slug)

  // The shopper's own page is theirs alone: a visitor is sent to sign in, and brought back here.
  if (place.section.kind === "account" && !shopper) redirect(routes.signIn({ back: routes.account() }) as Parameters<typeof redirect>[0])

  return (
    <StorefrontFrame
      store={store}
      categories={navigation.categories}
      activeCategory={category?.slug ?? null}
      catalogActive={place.section.kind === "catalog" && !scope}
      // A search or the catalogue narrowed to a category underlines it, as 5a does.
      markedCategory={scope ?? null}
      onSale={navigation.onSale}
      searchValue={place.term}
      searchScope={scope ?? null}
      year={new Date().getFullYear()}
      shopper={shopper}
      body={catalogue ? { layout: "flush", surface: "canvas" } : undefined}
      pageHeader={<StorefrontSectionBand place={place} routes={routes} {...(catalogue ? { catalogue } : {})} locale={locale} />}
      messages={ui}
    >
      {catalogue ? (
        // Not keyed by the address: a filter followed inside the page keeps the last shelf on screen,
        // dimmed and busy, rather than dropping the column into grey. A full load still streams this.
        <Suspense fallback={<StorefrontListingSkeleton productsPerRow={productsPerRow} withColumn className="pt-5 pb-10" messages={ui} />}>
          <StorefrontListing place={place} routes={routes} catalogue={catalogue} locale={locale} />
        </Suspense>
      ) : place.section.kind === "account" && shopper ? (
        <StorefrontAccountSection slug={store.slug} accountHref={routes.account()} profile={shopper} query={query} errors={(await getMessages()).web.errors} messages={ui} />
      ) : place.section.kind === "signIn" ? (
        <StorefrontSignInSection place={place} routes={routes} query={query} errors={(await getMessages()).web.errors} />
      ) : cart ? (
        <StorefrontCartLive
          products={cart.products}
          hrefs={Object.fromEntries(cart.products.map((product) => [product.id, routes.product(product.slug)]))}
          continueHref={routes.catalog()}
          goneOnArrival={cart.gone > 0}
          shopName={store.name}
          whatsapp={store.socialNetworks.whatsapp?.replace(/\D/g, "") || null}
          shopper={shopper}
          identityHrefs={{
            signInHref: routes.signIn({ back: routes.cart() }),
            signUpHref: routes.signIn({ mode: "criar", back: routes.cart() }),
            editHref: `${routes.account()}?${BACK_KEY}=${encodeURIComponent(routes.cart())}`,
          }}
          locale={locale}
          messages={ui}
        />
      ) : (
        <StorefrontCategoryGrid
          categories={navigation.categories}
          href={routes.category}
          catalogHref={routes.catalog()}
          locale={locale}
          messages={ui}
        />
      )}
    </StorefrontFrame>
  )
}
