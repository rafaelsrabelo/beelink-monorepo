// React
import { Suspense } from "react"

// Next
import { notFound, redirect } from "next/navigation"
import type { Metadata } from "next"

// UI
import { StorefrontCategoryGrid } from "@harness-monorepo/ui/blocks/storefront/storefront-category-grid"
import { StorefrontListingSkeleton } from "@harness-monorepo/ui/blocks/storefront/storefront-listing-skeleton"
import { StorefrontReorderNotice } from "@harness-monorepo/ui/blocks/storefront/storefront-reorder-notice"

// App
import { ShopUnavailable } from "@/components/storefront/shop-unavailable"
import { StorefrontFrame } from "@/components/storefront/storefront-frame"
import { StorefrontOffers } from "@/components/storefront/storefront-offers"
import { StorefrontCartLive } from "@/components/storefront/storefront-cart-live"
import { StorefrontCartSuggestions } from "@/components/storefront/storefront-cart-suggestions"
import { StorefrontCheckoutSection } from "@/components/storefront/storefront-checkout-section"
import { StorefrontListing } from "@/components/storefront/storefront-listing"
import { StorefrontAccountArea } from "@/components/storefront/account/storefront-account-area"
import { StorefrontSectionBand } from "@/components/storefront/storefront-section-band"
import { StorefrontResetPasswordSection } from "@/components/storefront/storefront-reset-password-section"
import { StorefrontSignInSection } from "@/components/storefront/storefront-sign-in-section"
import { StorefrontVerifyEmailSection } from "@/components/storefront/storefront-verify-email-section"
import { TrackView } from "@/components/storefront/tracking/track-view"
import { getMessages } from "@/lib/locale"
import { affiliateArrivalHref } from "@/lib/affiliate-arrival"
import { affiliateLinkAt } from "@/lib/affiliate-link"
import { cartAt } from "@/lib/cart"
import { COUPON_KEY, couponIn } from "@/lib/cart-coupon"
import { cartQuoteOf } from "@/lib/cart-pricing"
import { cartQuoteAt } from "@/lib/cart-quote"
import { cartViewOf } from "@/lib/cart-view"
import { customerFavoritesAt } from "@/lib/customer-favorites"
import { pendingReviewsAt } from "@/lib/customer-reviews"
import { OVERVIEW_FAVORITES } from "@/lib/overview-parts"
import { customerOrdersAt, customerReorderAt } from "@/lib/customer-orders"
import { reorderNoticeOf } from "@/lib/reorder-view"
import { shopShareOf } from "@/lib/shop-share"
import { offTheAirAt, unavailableMetadata } from "@/lib/shop-unavailable"
import { shopperAt } from "@/lib/shopper"
import { siteOrigin } from "@/lib/site-origin"
import { catalogueAt, paymentOptionsAt, shopAt } from "@/lib/storefront-data"
import { installmentTermsOf } from "@/lib/storefront-installments"
import { orderNumberOf, paramOf, REORDER_FAILED_KEY, REORDER_TRIMMED_KEY, REORDERED_KEY, storefrontRoutes } from "@/lib/storefront-routes"
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
  const shop = await shopAt(slug)
  if (shop?.unavailable && offTheAirAt(section, shop.routeWords)) return unavailableMetadata(shop)
  const place = await placeOf(slug, section, await searchParams)

  if (!place) return {}

  const { store } = place
  const address = canonicalOf(place, storefrontRoutes(store))
  const title = `${headingOf(place)} · ${store.name}`
  const description = store.description ?? undefined

  return {
    title,
    description,
    alternates: { canonical: address },
    // The page's own title, shop and all: these pages declared no card, so it is what a preview already read of them.
    openGraph: shopShareOf(store, { origin: await siteOrigin(), path: address, title, description }),
    // A paged or searched shelf is not a landing page; it is the same shelf, reached differently. Nor
    // is a deep combination of filters: three narrowings of one shelf are not a page of their own.
    robots:
      place.page > 1 || place.term || filterCountOf(place) >= 3 || ["cart", "checkout", "signIn", "verifyEmail", "resetPassword", "account"].includes(place.section.kind)
        ? { index: false, follow: true }
        : undefined,
  }
}

export default async function StorefrontSectionPage({ params, searchParams }: PageProps<"/[slug]/[section]">) {
  const { slug, section } = await params
  const query = await searchParams
  // Its page stopped paying (BEELINK-223): every address that sells is the notice — a customer's own pages are not.
  const shop = await shopAt(slug)
  if (shop?.unavailable && offTheAirAt(section, shop.routeWords)) return <ShopUnavailable store={shop} messages={(await getMessages()).ui} />
  const place = await placeOf(slug, section, query)

  if (!place) {
    // The segment's third reading, after a route word and a category (IMPULSEIA-105): an affiliate's
    // link leads to the shop — with the affiliate, while the link credits them — and never to a 404.
    const link = shop && !shop.unavailable ? await affiliateLinkAt(slug, { slug: section }) : null
    if (shop && link) redirect(affiliateArrivalHref(storefrontRoutes(shop).home, link.affiliate?.slug ?? null, query) as Parameters<typeof redirect>[0])
    notFound()
  }
  // A page of its own, with none of the shop's header around it.
  if (place.section.kind === "checkout") return <StorefrontCheckoutSection place={place} query={query} />

  const { store, category, navigation, messages: ui, scope } = place
  const routes = storefrontRoutes(store)
  const locale = "pt-BR"
  // 5a's four across; the shop's own choice, when it has made one, wins.
  const productsPerRow = store.layoutSettings.productsPerRow ?? 4
  // Asked once, awaited twice: by the band's count and by the grid, each under its own boundary.
  const catalogue = isShelf(place) ? catalogueAt(store.slug, listingAskOf(place)) : undefined
  // The basket: its lines from the cookie, priced by the catalogue, so the HTML already has them.
  // With it, the shop's card terms (BEELINK-205), for "em até 6x" under its total, and the shop's own
  // order for "Você também pode gostar" under it.
  const onCart = place.section.kind === "cart"
  const [cart, shopper, paymentOptions, suggestions] = await Promise.all([
    onCart ? cartAt(store.slug) : null,
    shopperAt(store.slug),
    onCart || isShelf(place) ? paymentOptionsAt(store.slug) : undefined,
    onCart ? catalogueAt(store.slug, { pageSize: 24 }).catch(() => null) : null,
  ])
  const installments = paymentOptions ? installmentTermsOf(paymentOptions) : undefined
  // And its totals, priced by the API as the order would be (BEELINK-194) and for whoever is reading
  // (BEELINK-245) — as a pick-up: the delivery is the checkout's, where the address is.
  const asked = cart ? cartQuoteOf(cartViewOf(cart.lines, cart.products).rows, "PICKUP", null) : null
  const served = asked ? await cartQuoteAt(store.slug, asked, shopper?.id ?? null) : null
  // The menu's counts, read together on the area's own front: each is its own call to the API. The
  // favourites' page is the rail's too, so the front reads it once.
  const [inProgress, liked, toRate] =
    place.section.kind === "account" && shopper
      ? await Promise.all([customerOrdersAt(store.slug, { situation: "ACTIVE", pageSize: 1 }), customerFavoritesAt(store.slug, { pageSize: OVERVIEW_FAVORITES }), pendingReviewsAt(store.slug)])
      : [null, null, null]
  const activeOrders = inProgress?.counts.ACTIVE
  const favorites = liked?.counts.ALL
  const pendingReviews = toRate?.length

  // "Comprar de novo" lands on the cart naming the order: read again here to say what stayed out.
  const reordered = cart && shopper ? orderNumberOf(paramOf(query[REORDERED_KEY])) : null
  const mark = reordered ? { number: reordered, failed: paramOf(query[REORDER_FAILED_KEY]) === "1", trimmed: paramOf(query[REORDER_TRIMMED_KEY]) === "1" } : null
  const reorderNotice = mark ? reorderNoticeOf(mark, mark.failed ? null : await customerReorderAt(store.slug, mark.number), ui) : null

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
      // On a shelf alone — the catalogue, a category, the search: the cart, the account and the sign-in pages show none.
      notice={catalogue ? <StorefrontOffers store={store} messages={ui} /> : undefined}
      // The shopper's area draws its own front (6c): the greeting is its heading, and there is no band.
      pageHeader={place.section.kind === "account" ? undefined : <StorefrontSectionBand place={place} routes={routes} {...(catalogue ? { catalogue } : {})} locale={locale} />}
      messages={ui}
    >
      {catalogue ? (
        // Not keyed by the address: a filter followed inside the page keeps the last shelf on screen,
        // dimmed and busy, rather than dropping the column into grey. A full load still streams this.
        <>
          {/* A search made, told once per term (BEELINK-272): the header's suggestions ask at every key and are not one. */}
          {place.section.kind === "search" && place.term ? <TrackView event={{ name: "Search", term: place.term }} viewKey={place.term} /> : null}
          <Suspense fallback={<StorefrontListingSkeleton productsPerRow={productsPerRow} withColumn className="pt-5 pb-10" messages={ui} />}>
            <StorefrontListing place={place} routes={routes} catalogue={catalogue} {...(installments ? { installments } : {})} locale={locale} />
          </Suspense>
        </>
      ) : place.section.kind === "account" && shopper ? (
        <StorefrontAccountArea
          slug={store.slug}
          routes={routes}
          shopper={shopper}
          tab={null}
          activeOrders={activeOrders}
          favorites={favorites}
          pendingReviews={pendingReviews}
          shopGivesCashback={store.cashback !== null}
          query={query}
          messages={ui}
        />
      ) : place.section.kind === "signIn" ? (
        <StorefrontSignInSection place={place} routes={routes} query={query} errors={(await getMessages()).web.errors} />
      ) : place.section.kind === "verifyEmail" ? (
        <StorefrontVerifyEmailSection place={place} routes={routes} query={query} />
      ) : place.section.kind === "resetPassword" ? (
        <StorefrontResetPasswordSection place={place} routes={routes} query={query} errors={(await getMessages()).web.errors} />
      ) : cart ? (
        <>
          <StorefrontCartLive
            slug={store.slug}
            products={cart.products}
            askedIds={cart.lines.map((line) => line.productId)}
            hrefs={Object.fromEntries(cart.products.map((product) => [product.id, routes.product(product.slug)]))}
            continueHref={routes.catalog()}
            checkoutHref={routes.checkout()}
            goneOnArrival={cart.gone > 0}
            shopper={shopper}
            arrival={reorderNotice ? <StorefrontReorderNotice {...reorderNotice} messages={ui} /> : undefined}
            served={served}
            coupon={couponIn(paramOf(query[COUPON_KEY]))}
            {...(installments ? { installments } : {})}
            locale={locale}
            messages={ui}
          />
          <StorefrontCartSuggestions
            catalogue={suggestions}
            excluding={cart.lines.map((line) => line.productId)}
            productHref={(productSlug) => routes.product(productSlug)}
            showPrice={store.layoutSettings.showProductPrice ?? true}
            {...(installments ? { installments } : {})}
            messages={ui}
          />
        </>
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
