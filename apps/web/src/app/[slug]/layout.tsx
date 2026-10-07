// Next
import { cookies } from "next/headers"

// App
import { CartProvider } from "@/components/storefront/cart-provider"
import { FavoritesProvider } from "@/components/storefront/favorites/favorites-provider"
import { figtree, shopFontStyle } from "@/components/storefront/shop-font"
import { ShopperRealtime } from "@/components/storefront/shopper-realtime"
import { StorefrontConsentGate } from "@/components/storefront/storefront-consent-gate"
import { StorefrontOrigin } from "@/components/storefront/storefront-origin"
import { StorefrontTracking } from "@/components/storefront/tracking/storefront-tracking"
import { cartLinesAt } from "@/lib/cart"
import { consentAt } from "@/lib/consent"
import { funnelCountedAt } from "@/lib/funnel-count"
import { getMessages } from "@/lib/locale"
import { REFRESH_COOKIE } from "@/lib/session-cookies"
import { shopperAt } from "@/lib/shopper"
import { quietPathsOf } from "@/lib/storefront-event"
import { shopAt } from "@/lib/storefront-data"
import { storefrontRoutes } from "@/lib/storefront-routes"

/**
 * The storefront's segment: every page of a shop, in the shop's typeface (`shop-font.ts`), with the
 * shop's cart — read from its cookie here, so the header's count is in the HTML and not a number
 * that flashes in after hydration.
 *
 * A signed-in shopper's real-time channel opens here, once, and lives across the shop's pages: in a
 * page's frame it would reopen at every page, and be dropped from the ones drawn from blocks.
 * `shopperAt` is the same per-request read the pages make for the header.
 *
 * The hearts of every card and product page read who is looking from here too (J15): the pages are
 * drawn the same for everyone, and a heart is the one part of them that knows.
 *
 * A shop that connected a Meta Pixel asks its visitor here, above every page, whether it may track
 * them for its ads (BEELINK-271), and keeps the answer for the pages below. Here and not in the
 * shop's frame: the panel's design preview draws the frame and never passes through this layout, so
 * a strip can never be drawn there. The answer is read from its cookie per request, like the cart,
 * and no kept read is keyed by it.
 *
 * What the shop tells Meta of a visitor who said yes is decided here as well (BEELINK-272), around
 * the same pages and inside the answer: the pixel loads, and every event of the shop window passes
 * through `StorefrontTracking`. A shop with no pixel gets it too, and it tells nothing — it is what
 * shuts a library left in the tab by the shop the visitor came from.
 *
 * Where the visitor came from is kept here too (BEELINK-275), for every shop, pixel or not: the
 * layout is what a landing mounts, and it sits inside the answer because Meta's click identifier
 * is kept only on a yes.
 *
 * And the shop's funnel is counted from here (BEELINK-276): a shop that sells counts its visits,
 * with or without a pixel, as anonymous numbers per day. Not for a browser that holds a panel
 * session — a shopkeeper looking at a shop is not a visit, and the cookie is read only to leave
 * them out.
 */
export default async function StorefrontLayout({ children, params }: LayoutProps<"/[slug]">) {
  const { slug } = await params
  const [lines, shopper, store, { ui }, choice, jar] = await Promise.all([cartLinesAt(), shopperAt(slug), shopAt(slug), getMessages(), consentAt(), cookies()])
  const countAt = funnelCountedAt(store, jar.has(REFRESH_COOKIE))
  const routes = store ? storefrontRoutes(store) : null

  const pages = routes ? (
    <FavoritesProvider slug={slug} signedIn={shopper !== null} signInPath={routes.signIn()} favoritesHref={routes.accountTab("favorites")} messages={ui}>
      {children}
    </FavoritesProvider>
  ) : (
    children
  )

  return (
    <div className={figtree.variable} style={shopFontStyle}>
      <CartProvider slug={slug} lines={lines}>
        {shopper ? <ShopperRealtime slug={slug} /> : null}
        <StorefrontConsentGate slug={slug} store={store} choice={choice} messages={ui}>
          {store ? <StorefrontOrigin slug={slug} pixelId={store.metaPixelId ?? null} /> : null}
          <StorefrontTracking pixelId={store?.metaPixelId ?? null} quietPaths={store ? quietPathsOf(store) : []} countAt={countAt}>
            {pages}
          </StorefrontTracking>
        </StorefrontConsentGate>
      </CartProvider>
    </div>
  )
}
