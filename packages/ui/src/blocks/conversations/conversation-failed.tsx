"use client"

// Locales
import { defaultMessages } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

export interface ConversationFailedProps {
  message: string
  onRetry: () => void
  messages?: UiMessages
}

/** A read of the conversations that failed: what, and the way to ask again. */
export function ConversationFailed({ message, onRetry, messages = defaultMessages }: ConversationFailedProps) {
  return (
    <div role="alert" className="flex flex-col items-center gap-3 px-2 py-10 text-center">
      <p className="text-sm">{message}</p>
      <button type="button" onClick={onRetry} className="hover:bg-muted rounded-md border px-3 py-1.5 text-sm font-medium">
        {messages.conversations.retry}
      </button>
    </div>
  )
}
