"use client"

// UI
import { ConversationList } from "@harness-monorepo/ui/blocks/conversations/conversation-list"
import { ConversationListSkeleton } from "@harness-monorepo/ui/blocks/conversations/conversation-list-skeleton"
import { Button } from "@harness-monorepo/ui/components/button"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// App
import { AppLink } from "@/components/app-link"
import { gestorOrderHrefOf } from "@/lib/gestor-board"
import { shopConversationRowsOf, shopConversationsAddressOf } from "@/lib/shop-conversation-view"
import { useShopConversations } from "@/services/conversations/shop-conversation-hooks"

export interface GestorConversationsScreenProps {
  slug: string
  locale: string
  messages: UiMessages
}

/**
 * The manager's conversations: the open ones, latest message first, each one opening its order on
 * the board, on its "Conversa" tab — a conversation is always about an order, and read beside it.
 */
export function GestorConversationsScreen({ slug, locale, messages }: GestorConversationsScreenProps) {
  const text = messages.gestor.conversations
  const address = shopConversationsAddressOf(new URLSearchParams())
  const list = useShopConversations(slug, { filter: address.filter })

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-col gap-1">
        <h1 className="text-foreground text-2xl font-bold">{text.title}</h1>
        <p className="text-shell-muted text-sm">{text.intro}</p>
      </header>
      {list.isPending ? (
        <ConversationListSkeleton />
      ) : !list.data ? (
        <div className="flex flex-col items-start gap-3">
          <p role="alert" className="text-destructive text-sm">
            {text.failed}
          </p>
          <Button type="button" variant="outline" onClick={() => void list.refetch()}>
            {text.retry}
          </Button>
        </div>
      ) : list.data.conversations.length === 0 ? (
        <p className="text-shell-muted bg-shell-surface rounded-xl border p-6 text-center text-sm">{text.empty}</p>
      ) : (
        <div className="bg-shell-surface border-shell-border max-w-3xl rounded-2xl border">
          <ConversationList
            rows={shopConversationRowsOf(list.data, address, slug, { locale, messages }).map((row) => ({ ...row, href: gestorOrderHrefOf(slug, row.number, "conversa") }))}
            linkComponent={AppLink}
            messages={messages}
          />
        </div>
      )}
    </div>
  )
}
