// App
import { CartProvider } from "@/components/storefront/cart-provider"
import { FavoritesProvider } from "@/components/storefront/favorites/favorites-provider"
import { figtree, shopFontStyle } from "@/components/storefront/shop-font"
import { ShopperRealtime } from "@/components/storefront/shopper-realtime"
import { StorefrontConsentGate } from "@/components/storefront/storefront-consent-gate"
import { StorefrontTracking } from "@/components/storefront/tracking/storefront-tracking"
import { cartLinesAt } from "@/lib/cart"
import { consentAt } from "@/lib/consent"
import { getMessages } from "@/lib/locale"
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
 */
export default async function StorefrontLayout({ children, params }: LayoutProps<"/[slug]">) {
  const { slug } = await params
  const [lines, shopper, store, { ui }, choice] = await Promise.all([cartLinesAt(), shopperAt(slug), shopAt(slug), getMessages(), consentAt()])
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
          <StorefrontTracking pixelId={store?.metaPixelId ?? null} quietPaths={store ? quietPathsOf(store) : []}>
            {pages}
          </StorefrontTracking>
        </StorefrontConsentGate>
      </CartProvider>
    </div>
  )
}
