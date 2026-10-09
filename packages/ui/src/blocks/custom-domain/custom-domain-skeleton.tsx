// UI
import { Skeleton } from "@harness-monorepo/ui/components/skeleton"

/** The domain's screen while it is read: the card — title, what it is for, the field, its button — and the records' table under it, in their places. */
export function CustomDomainSkeleton() {
  return (
    <div aria-hidden="true" className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 rounded-xl border p-4 sm:p-6">
        <Skeleton className="h-8 max-w-56" />
        <Skeleton className="h-4 max-w-xl" />
        <Skeleton className="h-10 max-w-xl" />
        <Skeleton className="h-8 max-w-36" />
      </div>
      <div className="flex flex-col gap-4 rounded-xl border p-4 sm:p-6">
        <Skeleton className="h-6 max-w-72" />
        <Skeleton className="h-4 max-w-xl" />
        {[0, 1, 2].map((at) => (
          <Skeleton key={at} className="h-10 w-full" />
        ))}
      </div>
    </div>
  )
}
