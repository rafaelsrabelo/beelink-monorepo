"use client"

// React
import { useEffect, useRef, useState } from "react"

// UI
import { ConversationFailed } from "@harness-monorepo/ui/blocks/conversations/conversation-failed"
import { ConversationReply } from "@harness-monorepo/ui/blocks/conversations/conversation-reply"
import { ConversationThread } from "@harness-monorepo/ui/blocks/conversations/conversation-thread"
import { ConversationThreadSkeleton } from "@harness-monorepo/ui/blocks/conversations/conversation-thread-skeleton"
import { OrderStatusBadge } from "@harness-monorepo/ui/blocks/orders/order-status-badge"
import { format } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// App
import { AppLink } from "@/components/app-link"
import { MESSAGE_MAX, messageLengthOf } from "@/lib/message-length"
import { shopConversationLinesOf, shopConversationStateOf } from "@/lib/shop-conversation-view"
import { useMarkShopConversationRead, useSendShopMessage, useShopConversation } from "@/services/conversations/shop-conversation-hooks"
import { ShopConversationError } from "@/services/conversations/shop-conversation-requests"

export interface ShopConversationLiveProps {
  slug: string
  number: number
  locale: string
  /** Its own head — customer, order, links — on the conversations' tab; inside the order, none. */
  headed?: boolean
  backHref?: string | null
  messages: UiMessages
}

/**
 * One order's conversation as the shop reads it, live, with the answer while the order is on its
 * way. The customer's unread messages are marked read while it shows — once per latest message, so
 * a read that fails is not asked again in a loop.
 */
export function ShopConversationLive({ slug, number, locale, headed = true, backHref = null, messages }: ShopConversationLiveProps) {
  const text = messages.conversations
  const conversation = useShopConversation(slug, number)
  const send = useSendShopMessage(slug, number)
  const { mutate: markRead } = useMarkShopConversationRead(slug, number)
  const [draft, setDraft] = useState("")

  const asked = useRef<string | null>(null)
  const unread = conversation.data?.unread ?? 0
  const latestFromCustomer = conversation.data?.messages.findLast((message) => message.kind === "MESSAGE" && message.author === "CUSTOMER")?.id ?? null
  useEffect(() => {
    if (unread === 0 || latestFromCustomer === null || asked.current === latestFromCustomer) return
    asked.current = latestFromCustomer
    markRead()
  }, [unread, latestFromCustomer, markRead])

  if (conversation.isPending) return <ConversationThreadSkeleton />
  // Only a first read that failed: a later one keeps the conversation, and the draft, on screen.
  if (!conversation.data) return <ConversationFailed message={text.threadFailed} onRetry={() => void conversation.refetch()} messages={messages} />

  const data = conversation.data
  const length = messageLengthOf(draft)
  const tooLong = length > MESSAGE_MAX
  const refused = send.error instanceof ShopConversationError && send.error.errorCode === "ORDER_CONVERSATION_CLOSED" ? text.refusedClosed : text.refusedUnknown
  const error = send.isError ? refused : tooLong ? format(text.tooLong, { max: new Intl.NumberFormat(locale).format(MESSAGE_MAX) }) : null

  const submit = () => {
    const sent = draft.trim()
    send.mutate(sent, {
      // What was typed while it went stays: only the answer that went leaves the field.
      onSuccess: () => setDraft((current) => (current.trim() === sent ? "" : current)),
      // Closed meanwhile, or its customer's account deleted: read again, and the answer box goes.
      onError: (failure) => {
        if (failure instanceof ShopConversationError && (failure.errorCode === "ORDER_CONVERSATION_CLOSED" || failure.errorCode === "ORDER_CONVERSATION_NOT_FOUND")) void conversation.refetch()
      },
    })
  }

  return (
    <ConversationThread
      customer={data.customer.name}
      order={
        <>
          {format(text.orderLine, { number: String(number) })}
          <OrderStatusBadge status={data.order.status} messages={messages} />
        </>
      }
      orderHref={`/admin/${slug}/orders/${number}`}
      customerHref={`/admin/${slug}/customers/${data.customer.id}`}
      backHref={backHref}
      lines={shopConversationLinesOf(data, { locale, messages })}
      state={shopConversationStateOf(data)}
      headed={headed}
      reply={
        <ConversationReply
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
