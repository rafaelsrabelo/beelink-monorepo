// UI
import { Skeleton } from "@harness-monorepo/ui/components/skeleton"

/** The promotions or the coupons while they load: three rows of a name, its lines and its buttons, as grey shapes. */
export function DiscountListSkeleton() {
  return (
    <div aria-hidden="true" className="divide-y">
      {[0, 1, 2].map((row) => (
        <div key={row} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start">
          <div className="flex flex-1 flex-col gap-2">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-3 w-1/2" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-9 w-20" />
            <Skeleton className="h-9 w-20" />
          </div>
        </div>
      ))}
    </div>
  )
}
