// UI
import { Skeleton } from "@harness-monorepo/ui/components/skeleton"

/** The invite while it is read: the shop, the condition, the terms and the fields, in their places. */
export function AffiliateInviteSkeleton() {
  return (
    <div aria-hidden="true" className="flex flex-col gap-5">
      <div className="flex items-center gap-3">
        <Skeleton className="size-10 rounded-lg" />
        <div className="flex flex-1 flex-col gap-1.5">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-3 w-56" />
        </div>
      </div>
      <Skeleton className="h-28 w-full rounded-lg" />
      <Skeleton className="h-24 w-full rounded-lg" />
      {[0, 1].map((at) => (
        <Skeleton key={at} className="h-10 w-full" />
      ))}
      <Skeleton className="h-10 w-full" />
    </div>
  )
}
