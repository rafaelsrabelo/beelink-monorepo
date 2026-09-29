"use client"

// Locales
import { defaultMessages } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

export interface StorefrontConversationFailedProps {
  /** What did not load, in the shopper's words. */
  message: string
  onRetry: () => void
  messages?: UiMessages
}

/** A read of the conversations that failed: what, and the way to ask again. */
export function StorefrontConversationFailed({ message, onRetry, messages = defaultMessages }: StorefrontConversationFailedProps) {
  const text = messages.storefront

  return (
    <div role="alert" className="flex flex-col items-center gap-3 px-1 py-6 text-center">
      <p className="text-sm text-shop-on-background">{message}</p>
      <button type="button" onClick={onRetry} className="h-10 rounded-full border border-shop-line-strong px-4 text-sm font-semibold text-shop-on-background hover:bg-shop-fill">
        {text.ordersRetry}
      </button>
    </div>
  )
}
