// UI
import { Card, CardContent, CardHeader } from "@harness-monorepo/ui/components/card"
import { Skeleton } from "@harness-monorepo/ui/components/skeleton"

// Locales
import { defaultMessages } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

export interface StoreListSkeletonProps {
  /** How many cards to hold the space for — as many as the list usually shows. */
  count?: number
  messages?: UiMessages
}

/**
 * The shop list while it loads. Every block here is the size of the thing it stands in for, so
 * nothing moves when the data lands — which is the whole reason this is not a spinner.
 */
export function StoreListSkeleton({ count = 2, messages = defaultMessages }: StoreListSkeletonProps) {
  return (
    <div role="status" aria-busy="true" className="grid gap-4 @3xl/main:grid-cols-2">
      <span className="sr-only">{messages.store.card.loading}</span>
      {Array.from({ length: count }, (_, index) => (
        <Card key={index} className="w-full" aria-hidden="true">
          <CardHeader>
            <div className="flex items-center gap-3">
              <Skeleton className="size-10 rounded-full" />
              <div className="flex flex-col gap-2">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-4 w-24" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex gap-2">
            <Skeleton className="h-8 w-28" />
            <Skeleton className="h-8 w-24" />
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
