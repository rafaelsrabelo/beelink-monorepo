// Next
import localFont from "next/font/local"

// React
import type { CSSProperties } from "react"

/**
 * Beelink's own typeface: the landing wears it, and the signed-out screens set the brand's name in it (BEELINK-256).
 *
 * Its design is drawn in Plus Jakarta Sans, from the light weight of its headings to the extra bold.
 * Loaded by those two and never by the root layout, for the reason `shop-font.ts` gives: a
 * font in the root is preloaded on every panel page too, and the panel stays in Geist.
 *
 * **The file is in the repository, not fetched from Google.** `next/font/google` downloads the font
 * while the image is built, and a build whose network did not reach Google failed the whole deploy
 * (01/10/2026: "module-not-found" on every `src` of `plus_jakarta_sans_*.module.css`). It is the
 * variable font's latin subset, weights 300 to 800 in one file, under the SIL Open Font License —
 * which covers pt-BR and en; a language outside latin falls back to the system's face.
 */
export const jakarta = localFont({
  src: "./fonts/plus-jakarta-sans-latin.woff2",
  variable: "--font-jakarta",
  weight: "300 800",
  style: "normal",
  display: "swap",
})

/** Put on the element that carries `jakarta.variable`: `LandingShell` reads `--font-brand`. */
export const brandFontStyle = { "--font-brand": "var(--font-jakarta)" } as CSSProperties
