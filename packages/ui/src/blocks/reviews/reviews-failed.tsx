// Locales
import { defaultMessages } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

export interface ReviewsFailedProps {
  onRetry: () => void
  messages?: UiMessages
}

/** A read of the reviews that failed: said so, never as a shop with none, and the way to ask again. */
export function ReviewsFailed({ onRetry, messages = defaultMessages }: ReviewsFailedProps) {
  const text = messages.reviews

  return (
    <div role="alert" className="flex flex-col items-center gap-3 px-2 py-10 text-center">
      <p className="text-sm">{text.failed}</p>
      <button type="button" onClick={onRetry} className="hover:bg-muted min-h-9 cursor-pointer rounded-md border px-3 text-sm font-medium">
        {text.retry}
      </button>
    </div>
  )
}
