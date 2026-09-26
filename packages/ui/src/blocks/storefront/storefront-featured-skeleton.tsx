// UI
import { Skeleton } from "@harness-monorepo/ui/components/skeleton"
import { cn } from "@harness-monorepo/ui/lib/utils"

export interface StorefrontFeaturedSkeletonProps {
  layout: "IMAGE_LEFT" | "IMAGE_LARGE"
  className?: string
}

/**
 * A featured product that has not arrived, in its own shape — the photo and the words beside it or
 * under it — and not a shelf's: the editor draws it while a new pick is being read. Hidden from a
 * reader; whoever holds it says what it is waiting for.
 */
export function StorefrontFeaturedSkeleton({ layout, className }: StorefrontFeaturedSkeletonProps) {
  const large = layout === "IMAGE_LARGE"

  return (
    <div aria-hidden="true" className={cn("grid items-center gap-6", large ? "mx-auto w-full max-w-4xl" : "shop-md:grid-cols-2", className)}>
      <Skeleton className={cn("w-full rounded-2xl", large ? "aspect-[16/9]" : "aspect-square")} />
      <div className={cn("flex flex-col gap-3", large && "items-center")}>
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-8 w-3/4" />
        <Skeleton className="h-9 w-1/2" />
        <Skeleton className="mt-2 h-12 w-full max-w-xs rounded-full" />
      </div>
    </div>
  )
}
