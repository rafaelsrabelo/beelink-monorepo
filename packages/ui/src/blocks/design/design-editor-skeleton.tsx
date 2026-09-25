// UI
import { Skeleton } from "@harness-monorepo/ui/components/skeleton"

/** The editor's frame while the page loads: the bar, the structure, the preview and the panel, empty. */
export function DesignEditorSkeleton() {
  return (
    <div aria-hidden="true" className="bg-shell flex h-dvh flex-col">
      <div className="bg-header h-header flex shrink-0 items-center gap-2 px-3">
        <Skeleton className="bg-header-field h-8 w-24" />
        <Skeleton className="bg-header-field ml-auto h-8 w-40" />
        <Skeleton className="bg-header-field h-8 w-24" />
      </div>
      <div className="flex min-h-0 flex-1">
        <div className="bg-shell-surface border-shell-border hidden w-90 shrink-0 flex-col gap-2 border-r p-3 lg:flex">
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
        </div>
        <div className="flex min-w-0 flex-1 justify-center p-4">
          <Skeleton className="h-full w-full max-w-sm rounded-xl" />
        </div>
        <div className="bg-shell-surface border-shell-border hidden w-85 shrink-0 flex-col gap-2 border-l p-3 lg:flex">
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      </div>
    </div>
  )
}
