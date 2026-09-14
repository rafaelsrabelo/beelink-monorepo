// UI
import { Skeleton } from "@harness-monorepo/ui/components/skeleton"

export default function DashboardLoading() {
  return (
    <>
      <div className="px-4 lg:px-6">
        <Skeleton className="h-6 w-56" />
      </div>
      <div className="grid gap-4 px-4 lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
      <div className="px-4 lg:px-6">
        <Skeleton className="h-80 w-full" />
      </div>
    </>
  )
}
