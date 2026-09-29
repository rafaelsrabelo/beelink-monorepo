"use client"

// React
import { useEffect, useRef, useState } from "react"

// Types
import type { StorefrontRouteWords } from "@harness-monorepo/contracts"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// UI
import { StorefrontConversationComposer } from "@harness-monorepo/ui/blocks/storefront/storefront-conversation-composer"
import { StorefrontConversationFailed } from "@harness-monorepo/ui/blocks/storefront/storefront-conversation-failed"
import { StorefrontConversationThread } from "@harness-monorepo/ui/blocks/storefront/storefront-conversation-thread"
import { StorefrontConversationThreadSkeleton } from "@harness-monorepo/ui/blocks/storefront/storefront-conversation-thread-skeleton"
import { format } from "@harness-monorepo/ui/locales/index"

// App
import { AppLink } from "@/components/app-link"
import { conversationRefusalOf } from "@/lib/conversation-refusal"
import { conversationLinesOf, MESSAGE_MAX, messageLengthOf } from "@/lib/conversation-view"
import { storefrontRoutes } from "@/lib/storefront-routes"
import { useMarkShopperConversationRead, useSendShopperMessage, useShopperConversation } from "@/services/conversations/conversation-hooks"
import { ShopperConversationError } from "@/services/conversations/conversation-requests"

export interface ConversationThreadLiveProps {
  slug: string
  routeWords: StorefrontRouteWords
  number: number
  /** Back to the list, in place; without it the conversation stands alone. */
  onBack?: () => void
  /** Leaving for the order's page, from inside the panel. */
  onViewOrder?: () => void
  messages: UiMessages
}

/**
 * One order's conversation, read live, with the composer while the order is on its way. The shop's
 * unread messages are marked read while it shows: the API tells the channel only when it marked
 * something, so the read, its event and the read again end there.
 */
export function ConversationThreadLive({ slug, routeWords, number, onBack, onViewOrder, messages }: ConversationThreadLiveProps) {
  const text = messages.storefront
  const routes = storefrontRoutes({ slug, routeWords })
  const conversation = useShopperConversation(slug, number)
  const send = useSendShopperMessage(slug, number)
  const { mutate: markRead } = useMarkShopperConversationRead(slug, number)
  const [draft, setDraft] = useState("")

  // Once per latest message from the shop: a read that fails is not asked again in a loop, and the
  // next message the shop sends asks once more.
  const asked = useRef<string | null>(null)
  const unread = conversation.data?.unread ?? 0
  const latestFromShop = conversation.data?.messages.findLast((message) => message.author === "SHOP")?.id ?? null
  useEffect(() => {
    if (unread === 0 || latestFromShop === null || asked.current === latestFromShop) return
    asked.current = latestFromShop
    markRead()
  }, [unread, latestFromShop, markRead])

  if (conversation.isPending) return <StorefrontConversationThreadSkeleton />
  // Only a first read that failed: a later one keeps the conversation on screen, and the draft with it.
  if (!conversation.data) return <StorefrontConversationFailed message={text.conversationFailed} onRetry={() => void conversation.refetch()} messages={messages} />

  const length = messageLengthOf(draft)
  const tooLong = length > MESSAGE_MAX
  const error = send.isError
    ? conversationRefusalOf(send.error, text)
    : tooLong
      ? format(text.conversationTooLong, { max: new Intl.NumberFormat("pt-BR").format(MESSAGE_MAX) })
      : null

  const submit = () => {
    const sent = draft.trim()
    send.mutate(sent, {
      // What was typed while it went stays: only the message that went leaves the field.
      onSuccess: () => setDraft((current) => (current.trim() === sent ? "" : current)),
      // The order ended meanwhile: read it again, and the composer gives way to the words that it did.
      onError: (failure) => {
        if (failure instanceof ShopperConversationError && failure.errorCode === "ORDER_CONVERSATION_CLOSED") void conversation.refetch()
      },
    })
  }

  return (
    <StorefrontConversationThread
      title={format(text.orderNumber, { number: String(number) })}
      orderHref={routes.accountOrder(number)}
      back={onBack ? { href: routes.accountTab("messages"), onBack } : null}
      lines={conversationLinesOf(conversation.data, { locale: "pt-BR", messages })}
      closed={!conversation.data.order.open}
      {...(onViewOrder ? { onViewOrder } : {})}
      composer={
        <StorefrontConversationComposer
          value={draft}
          onChange={(value) => {
            setDraft(value)
            if (send.isError) send.reset()
          }}
          onSubmit={submit}
          pending={send.isPending}
          error={error}
          canSend={length > 0 && !tooLong}
          messages={messages}
        />
      }
      linkComponent={AppLink}
      messages={messages}
    />
  )
}
