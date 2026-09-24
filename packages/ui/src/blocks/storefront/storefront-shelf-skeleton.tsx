// UI
import { Skeleton } from "@harness-monorepo/ui/components/skeleton"
import { cn } from "@harness-monorepo/ui/lib/utils"

// Locales
import { defaultMessages } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

export interface StorefrontShelfSkeletonProps {
  /** The shape the shelf will take, so nothing jumps when it arrives. */
  display?: "RAIL" | "GRID"
  messages?: UiMessages
}

const CARD = "flex flex-col gap-2"

/** A card's picture, name and price, as grey. */
const CARD_BODY = (
  <>
    <Skeleton className="aspect-square w-full rounded-xl" />
    <Skeleton className="h-4 w-3/4" />
    <Skeleton className="h-4 w-1/3" />
  </>
)

/**
 * A shelf of products that has not arrived: the header, and the cards in the shape the shelf will
 * have — a rail's fixed-width cards running off the edge, or a grid's rows.
 *
 * A skeleton and never a spinner (the root contract's third rule), and announced once to a screen
 * reader while the shapes themselves stay hidden: six grey squares read out one by one are noise.
 */
export function StorefrontShelfSkeleton({ display = "RAIL", messages = defaultMessages }: StorefrontShelfSkeletonProps) {
  return (
    <div role="status" aria-busy="true" className="@container flex w-full flex-col gap-3">
      <span className="sr-only">{messages.storefront.loadingShelf}</span>
      <div aria-hidden="true" className="flex flex-col gap-3">
        <Skeleton className="h-6 w-48" />
        {display === "RAIL" ? (
          <div className="flex gap-3 overflow-hidden">
            {Array.from({ length: 6 }, (_, index) => (
              <div key={index} className={cn(CARD, "w-44 shrink-0 sm:w-52 lg:w-64")}>
                {CARD_BODY}
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 @xl:grid-cols-3 @3xl:grid-cols-4">
            {Array.from({ length: 8 }, (_, index) => (
              <div key={index} className={CARD}>
                {CARD_BODY}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
