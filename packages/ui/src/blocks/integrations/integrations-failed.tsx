// UI
import { Button } from "@harness-monorepo/ui/components/button"

// Locales
import { defaultMessages } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

export interface IntegrationsFailedProps {
  onRetry: () => void
  messages?: UiMessages
}

/** A read of the shop's integrations that failed: said so, never as a shop with nothing connected, and the way to ask again. */
export function IntegrationsFailed({ onRetry, messages = defaultMessages }: IntegrationsFailedProps) {
  const text = messages.integrations

  return (
    <div role="alert" className="flex flex-col items-center gap-3 px-2 py-10 text-center">
      <p className="text-sm">{text.failed}</p>
      <Button type="button" variant="outline" size="sm" onClick={onRetry}>
        {text.retry}
      </Button>
    </div>
  )
}
