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
  /** The filter column's place beside the grid, from `shop-lg`, as the listing draws it. */
  withColumn?: boolean
  className?: string
  messages?: UiMessages
}

/**
 * A listing that has not arrived — the catalogue, a category, a search — under a shop whose header,
 * menu and results band are already drawn: a page of cards in the grid's own columns.
 *
 * A skeleton and never a spinner (the root contract's third rule), announced once to a screen reader
 * while the shapes stay hidden.
 */
export function StorefrontListingSkeleton({
  productsPerRow = 3,
  cards = 16,
  withColumn = false,
  className,
  messages = defaultMessages,
}: StorefrontListingSkeletonProps) {
  return (
    <div role="status" aria-busy="true" className={cn("flex gap-7", className)}>
      <span className="sr-only">{messages.storefront.loadingShelf}</span>

      {withColumn ? (
        <div aria-hidden="true" className="hidden w-66 shrink-0 flex-col gap-3 shop-lg:flex">
          <Skeleton className="h-6 w-24" />
          {Array.from({ length: 6 }, (_, index) => (
            <Skeleton key={index} className="h-4 w-40" />
          ))}
        </div>
      ) : null}

      <div aria-hidden="true" className="@container min-w-0 flex-1">
        <div className={cn("grid gap-4", CATALOG_COLUMNS[productsPerRow])}>
          {Array.from({ length: cards }, (_, index) => (
            <StorefrontCardSkeleton key={index} />
          ))}
        </div>
      </div>
    </div>
  )
}
