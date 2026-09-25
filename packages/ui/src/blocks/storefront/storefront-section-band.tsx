// React
import type { CSSProperties, ReactNode } from "react"

// UI
import { readableOn, toneOn } from "@harness-monorepo/ui/lib/contrast"
import { cn } from "@harness-monorepo/ui/lib/utils"

// Block
import { BAND } from "./storefront-band"

export interface StorefrontSectionBandProps {
  /** The anchor a menu link lands on. Given only to a named band; the offset clears the sticky header. */
  id?: string
  /** The shopkeeper's colour for this band. Null is the page's own, and paints nothing. */
  background?: string | null
  /**
   * The shop's own colour, needed to keep it readable when this band is dark.
   *
   * It is not read off a custom property, because the mixing is arithmetic: `toneOn` needs the
   * value, and a `var()` is a string the browser resolves later.
   */
  primary: string
  /** Edge to edge, or inside the shop's measure. */
  width?: "FULL" | "CONTAINED"
  /**
   * 32px of the band's own colour above and below what it holds — the page's one spacing, painted.
   * For a coloured band of words; a band of pictures lets the pictures fill its colour.
   */
  padded?: boolean
  children: ReactNode
  className?: string
}

/**
 * One band of the landing page, in the colour its owner chose for it.
 *
 * The band is where a background belongs, and saying so is what this whole level exists for: in a
 * flat list of blocks there is no band, only blocks that happen to be adjacent, and painting them
 * means painting each one and hoping they stay together.
 *
 * **Nobody picks a text colour.** A band redefines the page's ink for everything inside it, so a
 * black band in a pale shop reads white and the shop's own colour is mixed only as far as 4.5:1
 * requires. That is the same rule the window applies to its four surfaces, applied once more a
 * level down — and it is why a shopkeeper can pick any colour here without being able to make
 * their own words vanish.
 */
export function StorefrontSectionBand({
  id,
  background,
  primary,
  width = "CONTAINED",
  padded = false,
  children,
  className,
}: StorefrontSectionBandProps) {
  const dressed: CSSProperties | undefined = background
    ? ({
        "--shop-background": background,
        "--shop-on-background": readableOn(background),
        "--shop-primary-ink": toneOn(primary, background),
        "--shop-text": readableOn(background),
        "--shop-on-text": background,
        backgroundColor: background,
        color: readableOn(background),
      } as CSSProperties)
    : undefined

  return (
    <div {...(id ? { id } : {})} style={dressed} className={cn("scroll-mt-16", background && "w-full")}>
      {width === "CONTAINED" ? (
        <div className={cn(BAND, "flex flex-col", padded && "py-8", className)}>{children}</div>
      ) : (
        <div className={cn("flex flex-col", padded && "py-8", className)}>{children}</div>
      )}
    </div>
  )
}
