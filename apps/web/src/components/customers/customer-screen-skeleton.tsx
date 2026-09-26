// UI
import { Skeleton } from "@harness-monorepo/ui/components/skeleton"

/** The record's layout before the record arrives: the header, the six figures, the history and the details. */
export function CustomerScreenSkeleton() {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 lg:px-6">
      <div className="flex flex-col gap-3">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-4 w-40" />
      </div>
      <div className="grid grid-cols-2 gap-3 @2xl/main:grid-cols-3 @6xl/main:grid-cols-6">
        {Array.from({ length: 6 }, (_, index) => (
          <Skeleton key={index} className="h-20 w-full" />
        ))}
      </div>
      <div className="grid gap-6 @4xl/main:grid-cols-[minmax(0,1fr)_22rem]">
        <Skeleton className="h-72 w-full" />
        <Skeleton className="h-72 w-full" />
      </div>
    </div>
  )
}
