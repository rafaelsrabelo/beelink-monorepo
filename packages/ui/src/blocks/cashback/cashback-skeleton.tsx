// UI
import { Skeleton } from "@harness-monorepo/ui/components/skeleton"

/** The cashback screen while it is read: the three figures and the form's fields, in their places. */
export function CashbackSkeleton() {
  return (
    <div aria-hidden="true" className="flex flex-col gap-6">
      <div className="grid gap-3 sm:grid-cols-3">
        {[0, 1, 2].map((at) => (
          <Skeleton key={at} className="h-24 rounded-xl" />
        ))}
      </div>
      <div className="flex flex-col gap-4 rounded-xl border p-6">
        {[0, 1, 2, 3, 4].map((at) => (
          <Skeleton key={at} className="h-10 max-w-64" />
        ))}
      </div>
    </div>
  )
}
