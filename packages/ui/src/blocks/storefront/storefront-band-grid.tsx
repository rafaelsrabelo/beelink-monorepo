// React
import type { ReactNode } from "react"

// UI
import { cn } from "@harness-monorepo/ui/lib/utils"

export interface StorefrontBandGridProps {
  /**
   * An edge-to-edge band: 16px between its blocks both ways, side by side and stacked, so the seam
   * between two pictures is one width whichever way a phone lays them. They used to touch stacked,
   * the way they did when the band was a column, and a phone drew two banners as one.
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
 * In a contained band, 32px between rows, which was the space between stacked blocks, and 16px
 * between neighbours, which was the space between posters that shared a row.
 */
export function StorefrontBandGrid({ bleed = false, children, className }: StorefrontBandGridProps) {
  return <div className={cn("grid grid-cols-12", bleed ? "gap-4" : "gap-x-4 gap-y-8", className)}>{children}</div>
}
