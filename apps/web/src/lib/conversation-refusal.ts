// Types
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// App
import { ShopperConversationError } from "@/services/conversations/conversation-requests"

/**
 * Why a message was not sent, in the shopper's words: the order ended meanwhile, too many in a short
 * time, the session ended, or anything else — the draft stays in the field for every one of them.
 */
export function conversationRefusalOf(error: unknown, text: UiMessages["storefront"]): string {
  const code = error instanceof ShopperConversationError ? error.errorCode : null
  switch (code) {
    case "ORDER_CONVERSATION_CLOSED":
      return text.conversationRefusedClosed
    case "RATE_LIMITED":
      return text.conversationRefusedRate
    case "AUTH_UNAUTHENTICATED":
      return text.conversationRefusedSignedOut
    default:
      return text.conversationRefusedUnknown
  }
}
