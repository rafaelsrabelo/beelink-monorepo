// UI
import { Button } from "@harness-monorepo/ui/components/button"

// Locales
import { defaultMessages } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

export interface DiscountFailedProps {
  onRetry: () => void
  messages?: UiMessages
}

/** A read of the promotions or the coupons that failed: said so, never as a shop with none, and the way to ask again. */
export function DiscountFailed({ onRetry, messages = defaultMessages }: DiscountFailedProps) {
  const text = messages.discounts

  return (
    <div role="alert" className="flex flex-col items-center gap-3 px-2 py-10 text-center">
      <p className="text-sm">{text.failed}</p>
      <Button type="button" variant="outline" size="sm" onClick={onRetry}>
        {text.retry}
      </Button>
    </div>
  )
}
