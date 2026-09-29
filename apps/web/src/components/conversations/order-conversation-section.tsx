"use client"

// UI
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// App
import { ShopConversationLive } from "./shop-conversation-live"

export interface OrderConversationSectionProps {
  slug: string
  number: number
  locale: string
  messages: UiMessages
}

/** The order's conversation inside the order (BEELINK-164): read and answered with the order beside it. */
export function OrderConversationSection({ slug, number, locale, messages }: OrderConversationSectionProps) {
  return (
    <section aria-labelledby="order-conversation" className="bg-card flex max-h-[32rem] flex-col gap-3 rounded-xl border p-4">
      <h2 id="order-conversation" className="font-semibold">
        {messages.conversations.orderSection}
      </h2>
      <ShopConversationLive slug={slug} number={number} locale={locale} headed={false} messages={messages} />
    </section>
  )
}
