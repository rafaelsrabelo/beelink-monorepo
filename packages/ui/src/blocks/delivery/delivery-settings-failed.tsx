// UI
import { Button } from "@harness-monorepo/ui/components/button"

// Locales
import { defaultMessages } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

export interface DeliverySettingsFailedProps {
  onRetry: () => void
  messages?: UiMessages
}

/** A read of the delivery rules that failed: said so, never as a shop with every mode off, and the way to ask again. */
export function DeliverySettingsFailed({ onRetry, messages = defaultMessages }: DeliverySettingsFailedProps) {
  const text = messages.delivery

  return (
    <div role="alert" className="flex flex-col items-center gap-3 px-2 py-10 text-center">
      <p className="text-sm">{text.failed}</p>
      <Button type="button" variant="outline" size="sm" onClick={onRetry}>
        {text.retry}
      </Button>
    </div>
  )
}
