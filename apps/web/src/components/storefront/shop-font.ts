// Next
import { Figtree } from "next/font/google"

// React
import type { CSSProperties } from "react"

/**
 * The shop window's typeface, which the panel does not wear.
 *
 * The 5a/5b designs are drawn in Figtree, and every measurement in them holds only in it. It is
 * loaded by the storefront's own layout and by the design page's preview, never by the root
 * layout: a font in the root is preloaded on every panel page too, and the panel stays in Geist.
 * One module, so the two draw the shop in the same face and `next/font` sees one font.
 */
export const figtree = Figtree({ variable: "--font-figtree", subsets: ["latin"], weight: ["400", "500", "600", "700", "800"] })

/** Put on the element that carries `figtree.variable`: `StorefrontWindow` reads `--font-shop`. */
export const shopFontStyle = { "--font-shop": "var(--font-figtree)" } as CSSProperties
