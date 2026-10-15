// UI
import { Skeleton } from "@harness-monorepo/ui/components/skeleton"

/**
 * The Assinar screen while the page's subscription and the plans are read (BEELINK-293): the title
 * with its badge and two lines, then the form — three cycles side by side from `md`, the two fields
 * of who is charged, what to know before paying, and the button — each in its place.
 */
export function SubscriptionSkeleton() {
  return (
    <div aria-hidden="true" className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-5 w-20 rounded-4xl" />
        </div>
        <Skeleton className="h-4 w-full max-w-md" />
        <Skeleton className="h-4 w-full max-w-lg" />
      </div>
      <div className="flex flex-col gap-6 rounded-xl border p-4 sm:p-6">
        <Skeleton className="h-5 w-44" />
        <div className="grid gap-3 md:grid-cols-3">
          {[0, 1, 2].map((at) => (
            <Skeleton key={at} className="h-36 w-full rounded-lg" />
          ))}
        </div>
        <Skeleton className="h-5 w-36" />
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
        </div>
        <Skeleton className="h-32 w-full rounded-lg" />
        <Skeleton className="h-10 w-56" />
      </div>
    </div>
  )
}
