// UI
import { Skeleton } from "@harness-monorepo/ui/components/skeleton"

/** The report while it is read: the table's header, four lines and the total, in their places. */
export function SalesByOriginSkeleton() {
  return (
    <div aria-hidden="true" data-testid="sales-by-origin-skeleton" className="border-shell-border flex flex-col rounded-xl border">
      {[0, 1, 2, 3, 4, 5].map((at) => (
        <div key={at} className="flex h-12 items-center gap-3 border-b px-3 last:border-b-0 sm:px-4">
          <Skeleton className="h-4 flex-1" />
          <Skeleton className="h-4 w-8" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-10" />
        </div>
      ))}
    </div>
  )
}
