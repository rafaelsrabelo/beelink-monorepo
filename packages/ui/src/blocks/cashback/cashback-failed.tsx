// UI
import { Button } from "@harness-monorepo/ui/components/button"

// Locales
import { defaultMessages } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

export interface CashbackFailedProps {
  onRetry: () => void
  messages?: UiMessages
}

/** A read of the cashback that failed: said so, never as a shop or a customer with none, and the way to ask again. */
export function CashbackFailed({ onRetry, messages = defaultMessages }: CashbackFailedProps) {
  const text = messages.cashback

  return (
    <div role="alert" className="flex flex-col items-center gap-3 px-2 py-10 text-center">
      <p className="text-sm">{text.failed}</p>
      <Button type="button" variant="outline" size="sm" onClick={onRetry}>
        {text.retry}
      </Button>
    </div>
  )
}
