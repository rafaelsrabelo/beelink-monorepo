// Next
import { Plus_Jakarta_Sans } from "next/font/google"

// React
import type { CSSProperties } from "react"

/**
 * Beelink's own typeface: the landing wears it, and the signed-out screens set the brand's name in it (BEELINK-256).
 *
 * Its design is drawn in Plus Jakarta Sans, from the light weight of its headings to the extra bold.
 * Loaded by those two and never by the root layout, for the reason `shop-font.ts` gives: a
 * font in the root is preloaded on every panel page too, and the panel stays in Geist.
 */
export const jakarta = Plus_Jakarta_Sans({ variable: "--font-jakarta", subsets: ["latin"], weight: ["300", "400", "500", "600", "700", "800"] })

/** Put on the element that carries `jakarta.variable`: `LandingShell` reads `--font-brand`. */
export const brandFontStyle = { "--font-brand": "var(--font-jakarta)" } as CSSProperties
