// App
import { CartProvider } from "@/components/storefront/cart-provider"
import { FavoritesProvider } from "@/components/storefront/favorites/favorites-provider"
import { figtree, shopFontStyle } from "@/components/storefront/shop-font"
import { ShopperRealtime } from "@/components/storefront/shopper-realtime"
import { cartLinesAt } from "@/lib/cart"
import { getMessages } from "@/lib/locale"
import { shopperAt } from "@/lib/shopper"
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
 */
export default async function StorefrontLayout({ children, params }: LayoutProps<"/[slug]">) {
  const { slug } = await params
  const [lines, shopper, store, { ui }] = await Promise.all([cartLinesAt(), shopperAt(slug), shopAt(slug), getMessages()])
  const routes = store ? storefrontRoutes(store) : null

  return (
    <div className={figtree.variable} style={shopFontStyle}>
      <CartProvider slug={slug} lines={lines}>
        {shopper ? <ShopperRealtime slug={slug} /> : null}
        {routes ? (
          <FavoritesProvider slug={slug} signedIn={shopper !== null} signInPath={routes.signIn()} favoritesHref={routes.accountTab("favorites")} messages={ui}>
            {children}
          </FavoritesProvider>
        ) : (
          children
        )}
      </CartProvider>
    </div>
  )
}
