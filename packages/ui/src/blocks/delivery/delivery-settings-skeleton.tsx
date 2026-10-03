// UI
import { Skeleton } from "@harness-monorepo/ui/components/skeleton"

// Locales
import { defaultMessages } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

export interface DeliverySettingsSkeletonProps {
  messages?: UiMessages
}

/** The Delivery tab while its rules load: the same three cards, so nothing moves when they arrive. */
export function DeliverySettingsSkeleton({ messages = defaultMessages }: DeliverySettingsSkeletonProps) {
  return (
    <div role="status" aria-busy="true" className="flex w-full flex-col gap-4">
      <span className="sr-only">{messages.delivery.loading}</span>
      <Skeleton aria-hidden="true" className="h-4 w-2/3" />
      {Array.from({ length: 3 }, (_, index) => (
        <div key={index} aria-hidden="true" className="border-shell-border flex items-start gap-3 rounded-xl border p-4 sm:p-6">
          <Skeleton className="size-10 rounded-lg" />
          <div className="flex flex-1 flex-col gap-2">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-4 w-3/4" />
          </div>
          <Skeleton className="h-5 w-9 rounded-full" />
        </div>
      ))}
    </div>
  )
}
