// UI
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
 * A listing that has not arrived — the catalogue, a category, a search — under a shop whose header,
 * menu and results band are already drawn: a page of cards in the grid's own columns.
 *
 * A skeleton and never a spinner (the root contract's third rule), announced once to a screen reader
 * while the shapes stay hidden.
 */
export function StorefrontListingSkeleton({ productsPerRow = 3, cards = 16, messages = defaultMessages }: StorefrontListingSkeletonProps) {
  return (
    <div role="status" aria-busy="true" className="flex flex-col gap-8">
      <span className="sr-only">{messages.storefront.loadingShelf}</span>

      <div aria-hidden="true" className={cn("grid gap-4", CATALOG_COLUMNS[productsPerRow])}>
        {Array.from({ length: cards }, (_, index) => (
          <StorefrontCardSkeleton key={index} />
        ))}
      </div>
    </div>
  )
}
