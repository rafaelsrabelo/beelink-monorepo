// UI
import { Skeleton } from "@harness-monorepo/ui/components/skeleton"

/** What the screen looks like while the signed-in person is still on the way. */
export function AppShellSkeleton() {
  return (
    <div className="flex min-h-svh">
      <div className="hidden w-64 flex-col gap-3 border-r p-4 md:flex">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-6 w-full" />
        <Skeleton className="h-6 w-full" />
        <Skeleton className="h-6 w-3/4" />
        <Skeleton className="mt-auto h-12 w-full" />
      </div>
      <div className="flex flex-1 flex-col">
        <div className="flex h-12 items-center gap-2 border-b px-4">
          <Skeleton className="h-6 w-32" />
        </div>
        <div className="grid gap-4 p-4 md:grid-cols-2 lg:grid-cols-4">
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
        </div>
        <Skeleton className="mx-4 h-64" />
      </div>
    </div>
  )
}
