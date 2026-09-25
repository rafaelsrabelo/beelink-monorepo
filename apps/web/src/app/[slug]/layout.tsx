// App
import { CartProvider } from "@/components/storefront/cart-provider"
import { figtree, shopFontStyle } from "@/components/storefront/shop-font"
import { cartLinesAt } from "@/lib/cart"

/**
 * The storefront's segment: every page of a shop, in the shop's typeface (`shop-font.ts`), with the
 * shop's cart — read from its cookie here, so the header's count is in the HTML and not a number
 * that flashes in after hydration.
 */
export default async function StorefrontLayout({ children, params }: LayoutProps<"/[slug]">) {
  const { slug } = await params

  return (
    <div className={figtree.variable} style={shopFontStyle}>
      <CartProvider slug={slug} lines={await cartLinesAt()}>
        {children}
      </CartProvider>
    </div>
  )
}
