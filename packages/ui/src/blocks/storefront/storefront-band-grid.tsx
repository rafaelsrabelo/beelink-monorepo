// React
import type { ReactNode } from "react"

// UI
import { cn } from "@harness-monorepo/ui/lib/utils"

export interface StorefrontBandGridProps {
  /**
   * An edge-to-edge band. Its blocks touch, the way they did when the band stacked them: a gap
   * between two full-bleed pictures is a stripe of page colour through the middle of the band.
   */
  bleed?: boolean
  /** `StorefrontBandCell`s. Anything else takes one column of twelve. */
  children: ReactNode
  className?: string
}

/**
 * The blocks of one band, laid on twelve columns, each taking its own slice.
 *
 * This is what lets two banners sit side by side. The band used to be a column, so every block was
 * a row of its own whatever width it was given, and "um terço" drew a third of the band with two
 * thirds of nothing beside it. Blocks flow now: a half and a half share a row, and so do a third and
 * two thirds.
 *
 * The gaps are the band's old ones: 32px between rows, which was the space between stacked blocks,
 * and 16px between neighbours, which was the space between posters that shared a row.
 */
export function StorefrontBandGrid({ bleed = false, children, className }: StorefrontBandGridProps) {
  return <div className={cn("grid grid-cols-12", bleed ? "gap-0" : "gap-x-4 gap-y-8", className)}>{children}</div>
}
