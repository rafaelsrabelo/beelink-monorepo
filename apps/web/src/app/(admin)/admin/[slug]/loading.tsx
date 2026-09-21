// UI
import { Skeleton } from "@harness-monorepo/ui/components/skeleton"

export default function StoreOverviewLoading() {
  return (
    <div className="flex flex-col gap-4 px-4 lg:px-6">
      <Skeleton className="h-6 w-48" />
      <Skeleton className="h-40 w-full" />
    </div>
  )
}
