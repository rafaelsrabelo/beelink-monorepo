// UI
import { Skeleton } from "@harness-monorepo/ui/components/skeleton"

/** The panel's reviews while they load: three rows of stars, words and a button, as grey shapes. */
export function ReviewListSkeleton() {
  return (
    <div aria-hidden="true" className="divide-y">
      {[0, 1, 2].map((row) => (
        <div key={row} className="flex gap-4 p-4">
          <div className="flex flex-1 flex-col gap-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/3" />
          </div>
          <Skeleton className="h-9 w-24" />
        </div>
      ))}
    </div>
  )
}
