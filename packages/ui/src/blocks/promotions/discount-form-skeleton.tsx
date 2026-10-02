// UI
import { Skeleton } from "@harness-monorepo/ui/components/skeleton"

/** A promotion or a coupon being read for its page: the form's fields and its buttons, as grey shapes. */
export function DiscountFormSkeleton() {
  return (
    <div aria-hidden="true" className="flex flex-col gap-6">
      {[0, 1, 2].map((field) => (
        <div key={field} className="flex flex-col gap-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-9 w-full" />
        </div>
      ))}
      <div className="grid gap-4 sm:grid-cols-2">
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-9 w-full" />
      </div>
      <div className="flex gap-2">
        <Skeleton className="h-9 w-24" />
        <Skeleton className="h-9 w-24" />
      </div>
    </div>
  )
}
