// UI
import { Skeleton } from "@harness-monorepo/ui/components/skeleton"

/** The Integrations page while it is read: the Melhor Envio card and the settings under it, in their places. */
export function IntegrationsSkeleton() {
  return (
    <div aria-hidden="true" className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 rounded-xl border p-6">
        <Skeleton className="h-6 max-w-40" />
        <Skeleton className="h-4 max-w-xl" />
        <Skeleton className="h-10 max-w-48" />
      </div>
      <div className="flex flex-col gap-4 rounded-xl border p-6">
        {[0, 1, 2, 3].map((at) => (
          <Skeleton key={at} className="h-10 max-w-64" />
        ))}
      </div>
    </div>
  )
}
