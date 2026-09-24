// UI
import { Skeleton } from "@harness-monorepo/ui/components/skeleton"
import { cn } from "@harness-monorepo/ui/lib/utils"

// Locales
import { defaultMessages } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import { StorefrontCardSkeleton } from "./storefront-card-skeleton"
import { CATALOG_COLUMNS } from "./storefront-catalog"

export interface StorefrontListingSkeletonProps {
  /** The shopkeeper's columns, so the grid that arrives has the shape the wait had. */
  productsPerRow?: 2 | 3 | 4
  /** One page: sixteen, the 4 × 4 grid of 5a. */
  cards?: number
  messages?: UiMessages
}

/**
 * A listing that has not arrived — the catalogue, a category, a search — inside a shop whose header
 * and menu are already drawn: the trail, the title and its count, then a page of cards in the grid's
 * own columns.
 *
 * A skeleton and never a spinner (the root contract's third rule), announced once to a screen reader
 * while the shapes stay hidden. It stands where the listing will stand, so it spaces its two halves
 * the way the page spaces the heading and the grid.
 */
export function StorefrontListingSkeleton({ productsPerRow = 3, cards = 16, messages = defaultMessages }: StorefrontListingSkeletonProps) {
  return (
    <div role="status" aria-busy="true" className="flex flex-col gap-8">
      <span className="sr-only">{messages.storefront.loadingShelf}</span>

      <div aria-hidden="true" className="flex flex-col gap-3">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-4 w-28" />
      </div>

      <div aria-hidden="true" className={cn("grid gap-4", CATALOG_COLUMNS[productsPerRow])}>
        {Array.from({ length: cards }, (_, index) => (
          <StorefrontCardSkeleton key={index} />
        ))}
      </div>
    </div>
  )
}
