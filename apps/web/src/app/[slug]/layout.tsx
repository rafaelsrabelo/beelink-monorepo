// App
import { figtree, shopFontStyle } from "@/components/storefront/shop-font"

/** The storefront's segment: every page of a shop, in the shop's typeface. See `shop-font.ts`. */
export default function StorefrontLayout({ children }: LayoutProps<"/[slug]">) {
  return (
    <div className={figtree.variable} style={shopFontStyle}>
      {children}
    </div>
  )
}
