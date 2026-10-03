// UI
import { Card, CardContent } from "@harness-monorepo/ui/components/card"
import { Skeleton } from "@harness-monorepo/ui/components/skeleton"

// Locales
import { defaultMessages } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

export interface StoreSettingsSkeletonProps {
  messages?: UiMessages
}

/**
 * The settings form while the shop loads: the same title, the same row of six tabs and the same
 * card of four fields below them, so nothing moves when the data arrives.
 */
export function StoreSettingsSkeleton({ messages = defaultMessages }: StoreSettingsSkeletonProps) {
  return (
    <div role="status" aria-busy="true" className="flex w-full flex-col gap-4">
      <span className="sr-only">{messages.store.settings.loading}</span>
      <div aria-hidden="true" className="flex flex-col gap-2">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-4 w-72" />
      </div>
      <div aria-hidden="true" className="flex gap-2">
        {Array.from({ length: 6 }, (_, index) => (
          <Skeleton key={index} className="h-8 w-28" />
        ))}
      </div>
      <Card aria-hidden="true">
        <CardContent className="flex flex-col gap-5">
          {Array.from({ length: 4 }, (_, index) => (
            <div key={index} className="flex flex-col gap-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-8 w-full" />
            </div>
          ))}
        </CardContent>
      </Card>
      <Skeleton aria-hidden="true" className="h-16 w-full" />
    </div>
  )
}
