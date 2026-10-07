// UI
import { Skeleton } from "@harness-monorepo/ui/components/skeleton"

/** The funnel while it is read: five steps in their places — a name, a number, a bar and two lines each. */
export function StoreFunnelSkeleton() {
  return (
    <div aria-hidden="true" data-testid="store-funnel-skeleton" className="bg-shell-surface border-shell-border flex flex-col rounded-xl border shadow-xs">
      {[0, 1, 2, 3, 4].map((at) => (
        <div key={at} className="flex flex-col gap-2 border-b px-4 py-4 last:border-b-0 sm:px-6">
          <div className="flex items-baseline justify-between gap-3">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-7 w-14" />
          </div>
          <Skeleton className="h-2 w-full rounded-full" />
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-5 w-56" />
        </div>
      ))}
    </div>
  )
}
