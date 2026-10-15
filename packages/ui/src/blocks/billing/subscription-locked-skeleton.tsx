// UI
import { Skeleton } from "@harness-monorepo/ui/components/skeleton"

/**
 * A locked page's notice while the reason is read (BEELINK-296): the page's name, the title beside its
 * badge and two lines of text, then the card of the plan — its title, three periods, the renewal and the
 * button — and what being locked means, each in its place.
 */
export function SubscriptionLockedSkeleton() {
  return (
    <div aria-hidden="true" className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-2 sm:py-6 lg:px-6">
      <div className="flex flex-col gap-3">
        <Skeleton className="h-5 w-40" />
        <div className="flex items-center gap-3">
          <Skeleton className="size-10 rounded-full" />
          <Skeleton className="h-8 w-64" />
        </div>
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-4/5" />
      </div>
      <div className="flex flex-col gap-4 rounded-xl border p-4 sm:p-6">
        <Skeleton className="h-6 w-56" />
        {[0, 1, 2].map((at) => (
          <Skeleton key={at} className="h-4 w-full max-w-sm" />
        ))}
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-10 w-full sm:w-44" />
      </div>
      <div className="flex flex-col gap-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-2/3" />
      </div>
    </div>
  )
}
