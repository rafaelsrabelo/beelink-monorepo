// UI
import { Skeleton } from "@harness-monorepo/ui/components/skeleton"

/** The address screen while the page is read (BEELINK-331): the title, the address it has, the field, what a change does, the button — in their places. */
export function StoreAddressChangeSkeleton() {
  return (
    <div aria-hidden="true" className="flex flex-col gap-4 rounded-xl border p-4 sm:p-6">
      <Skeleton className="h-8 max-w-56" />
      <Skeleton className="h-4 max-w-md" />
      <Skeleton className="h-4 max-w-28" />
      <Skeleton className="h-9 max-w-xl" />
      <Skeleton className="h-4 max-w-lg" />
      <Skeleton className="h-10 max-w-sm" />
      {[0, 1, 2, 3].map((at) => (
        <Skeleton key={at} className="h-4 max-w-xl" />
      ))}
      <Skeleton className="h-9 max-w-40" />
    </div>
  )
}
