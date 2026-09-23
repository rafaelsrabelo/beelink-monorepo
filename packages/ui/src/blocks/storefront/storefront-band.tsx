// React
import type { ReactNode } from "react"

// UI
import { cn } from "@harness-monorepo/ui/lib/utils"

/**
 * The shop's measure — the width every band on the page lines up against.
 *
 * 1440 and not the 1152 it started at. The shop owner said the page read as too centred and he was
 * right: at 1152 a wide monitor shows a column of shop with a hand's width of empty page on each
 * side, and a rail of four product cards inside it has cards the size of stamps. Every shop this
 * was measured against runs to about this width and then stops — stopping matters too, because a
 * line of body text the full width of a 27-inch screen is a line nobody finishes.
 */
export const BAND = "mx-auto w-full max-w-[1440px] px-4 sm:px-6 lg:px-10"

export interface StorefrontBandProps {
  children: ReactNode
  className?: string
}

/**
 * One band, contained.
 *
 * It exists because the landing page stopped being a fixed stack of bands and became an ordered
 * list the shopkeeper arranges. When the window owned every band it could decide which ones were
 * contained and which bled to the edges; now that a block can sit anywhere, the block has to say
 * which it is — and a cover that bleeds is the one that says otherwise.
 */
export function StorefrontBand({ children, className }: StorefrontBandProps) {
  return <div className={cn(BAND, className)}>{children}</div>
}
