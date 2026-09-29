// App
import { CartProvider } from "@/components/storefront/cart-provider"
import { figtree, shopFontStyle } from "@/components/storefront/shop-font"
import { ShopperRealtime } from "@/components/storefront/shopper-realtime"
import { cartLinesAt } from "@/lib/cart"
import { shopperAt } from "@/lib/shopper"

/**
 * The storefront's segment: every page of a shop, in the shop's typeface (`shop-font.ts`), with the
 * shop's cart — read from its cookie here, so the header's count is in the HTML and not a number
 * that flashes in after hydration.
 *
 * A signed-in shopper's real-time channel opens here, once, and lives across the shop's pages: in a
 * page's frame it would reopen at every page, and be dropped from the ones drawn from blocks.
 * `shopperAt` is the same per-request read the pages make for the header.
 */
export default async function StorefrontLayout({ children, params }: LayoutProps<"/[slug]">) {
  const { slug } = await params
  const [lines, shopper] = await Promise.all([cartLinesAt(), shopperAt(slug)])

  return (
    <div className={figtree.variable} style={shopFontStyle}>
      <CartProvider slug={slug} lines={lines}>
        {shopper ? <ShopperRealtime slug={slug} /> : null}
        {children}
      </CartProvider>
    </div>
  )
}
