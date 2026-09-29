"use client"

// React
import { createContext, use, useMemo, useRef, useState, type ReactNode } from "react"

// Types
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// UI
import { StorefrontOrderCancelledNotice } from "@harness-monorepo/ui/blocks/storefront/storefront-order-cancelled-notice"

export interface OrderCancelNoticeValue {
  /** Says this order was cancelled, over the list. */
  announce: (number: number) => void
  /** The line that says it: where focus lands, since the cancelled card may leave the tab. */
  target: () => HTMLElement | null
}

const NoticeContext = createContext<OrderCancelNoticeValue | null>(null)

export interface OrderCancelNoticeProps {
  messages: UiMessages
  children: ReactNode
}

/**
 * The line over the list that says a cancel went through. A client component above the cards, so
 * the page read again after the cancel redraws them and leaves this line — and its words — in place.
 */
export function OrderCancelNotice({ messages, children }: OrderCancelNoticeProps) {
  const [cancelled, setCancelled] = useState<number | null>(null)
  const region = useRef<HTMLDivElement>(null)
  const value = useMemo<OrderCancelNoticeValue>(() => ({ announce: setCancelled, target: () => region.current }), [])

  return (
    <NoticeContext value={value}>
      <StorefrontOrderCancelledNotice ref={region} number={cancelled} messages={messages} />
      {children}
    </NoticeContext>
  )
}

/** The list's notice, or null where a cancel has none above it. */
export function useOrderCancelNotice(): OrderCancelNoticeValue | null {
  return use(NoticeContext)
}
