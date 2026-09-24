// React
import type { ReactNode } from "react"

// UI
import { cn } from "@harness-monorepo/ui/lib/utils"

/**
 * How much of its band a block takes. The contract's `ComponentSpan`, restated here for the reason
 * `design/design-types.ts` gives: a block renders in Storybook with nothing behind it.
 */
export const STOREFRONT_SPANS = ["FULL", "HALF", "THIRD", "TWO_THIRDS"] as const
export type StorefrontSpan = (typeof STOREFRONT_SPANS)[number]

/**
 * Twelve columns, which is the smallest grid all four slices divide.
 *
 * Below 640px every block is the whole width: a third of a phone is a thumbnail with a headline
 * that cannot fit. From 640px to 1024px the thirds are halves, as the posters were before the band
 * was a grid — a third of 640px is 187px, and a linked poster's title and arrow do not fit in it. A
 * third and two thirds still share a row there, as two halves. From 1024px every slice is its own.
 */
const COLUMNS: Record<StorefrontSpan, string> = {
  FULL: "shop-sm:col-span-12",
  TWO_THIRDS: "shop-sm:col-span-6 shop-lg:col-span-8",
  HALF: "shop-sm:col-span-6",
  THIRD: "shop-sm:col-span-6 shop-lg:col-span-4",
}

export interface StorefrontBandCellProps {
  span: StorefrontSpan
  children: ReactNode
  className?: string
}

/**
 * One block's slice of a `StorefrontBandGrid`.
 *
 * `min-w-0` because a grid item's minimum width is its content's by default, and a carousel's track
 * is as wide as all its slides: without it a two-slide banner in a third pushes its neighbours off
 * the row instead of scrolling inside its own cell.
 */
export function StorefrontBandCell({ span, children, className }: StorefrontBandCellProps) {
  return (
    <div data-span={span} className={cn("col-span-12 min-w-0", COLUMNS[span], className)}>
      {children}
    </div>
  )
}
