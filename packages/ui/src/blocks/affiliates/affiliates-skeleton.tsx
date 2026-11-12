// UI
import { Skeleton } from "@harness-monorepo/ui/components/skeleton"

export interface AffiliatesSkeletonProps {
  /** A form's fields, or a list's rows. */
  shape?: "form" | "list"
}

/** An affiliate screen while it is read: the fields or the rows, in their places. */
export function AffiliatesSkeleton({ shape = "form" }: AffiliatesSkeletonProps) {
  if (shape === "list") {
    return (
      <div aria-hidden="true" className="flex flex-col gap-2">
        {[0, 1, 2, 3].map((at) => (
          <Skeleton key={at} className="h-16 w-full rounded-xl" />
        ))}
      </div>
    )
  }

  return (
    <div aria-hidden="true" className="flex flex-col gap-4 rounded-xl border p-6">
      <Skeleton className="h-6 w-48" />
      {[0, 1, 2].map((at) => (
        <Skeleton key={at} className="h-10 max-w-64" />
      ))}
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-28 w-full" />
    </div>
  )
}
