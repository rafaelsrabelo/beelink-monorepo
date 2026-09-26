// UI
import { Card, CardContent, CardHeader } from "@harness-monorepo/ui/components/card"
import { Skeleton } from "@harness-monorepo/ui/components/skeleton"

// Locales
import { defaultMessages } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

export interface StoreSettingsSkeletonProps {
  messages?: UiMessages
}

/**
 * The settings form while the shop loads: the same card, the same row of six tabs and the same
 * four fields below them, so nothing moves when the data arrives.
 */
export function StoreSettingsSkeleton({ messages = defaultMessages }: StoreSettingsSkeletonProps) {
  return (
    <div role="status" aria-busy="true">
      <span className="sr-only">{messages.store.settings.loading}</span>
      <Card aria-hidden="true">
        <CardHeader>
          <Skeleton className="h-6 w-40" />
          <Skeleton className="mt-2 h-4 w-72" />
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          <div className="flex gap-2">
            {Array.from({ length: 6 }, (_, index) => (
              <Skeleton key={index} className="h-8 w-28" />
            ))}
          </div>
          <div className="flex flex-col gap-5">
            {Array.from({ length: 4 }, (_, index) => (
              <div key={index} className="flex flex-col gap-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-8 w-full" />
              </div>
            ))}
          </div>
          <Skeleton className="h-8 w-36 self-end" />
        </CardContent>
      </Card>
    </div>
  )
}
