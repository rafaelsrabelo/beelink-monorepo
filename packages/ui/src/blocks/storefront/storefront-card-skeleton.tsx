// UI
import { Skeleton } from "@harness-monorepo/ui/components/skeleton"
import { cn } from "@harness-monorepo/ui/lib/utils"

export interface StorefrontCardSkeletonProps {
  /** The width a rail gives its cards; a grid's cell decides it otherwise. */
  className?: string
}

/**
 * A product card that has not arrived, in the card's own shape: the bordered frame, the photo flush
 * at the top at 259:230, two lines of name and the price. Hidden from a reader — the skeleton that
 * holds it announces the wait once.
 */
export function StorefrontCardSkeleton({ className }: StorefrontCardSkeletonProps) {
  return (
    <div aria-hidden="true" className={cn("flex flex-col overflow-hidden rounded-xl border border-shop-line", className)}>
      <Skeleton className="aspect-[259/230] w-full rounded-none" />
      <div className="flex flex-col gap-1.5 p-3.5">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="mt-1 h-7 w-1/2" />
      </div>
    </div>
  )
}
