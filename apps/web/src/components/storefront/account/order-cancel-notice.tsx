"use client"

// React
import { createContext, use, useMemo, useRef, useState, type ReactNode, type RefObject } from "react"

export interface OrderCancelNoticeValue {
  /** The order just cancelled; null until one is. */
  cancelled: number | null
  /** Says this order was cancelled, where the screen put its line. */
  announce: (number: number) => void
  /** The line that says it: where focus lands, since the cancelled card may leave the tab. */
  region: RefObject<HTMLDivElement | null>
}

const NoticeContext = createContext<OrderCancelNoticeValue | null>(null)

/**
 * Holds the news of a cancel that went through, for the line that says it (`OrderCancelNoticeLine`)
 * and the cancel that makes it. A client component around what the page redraws after the cancel,
 * so the redraw leaves its state — and the line's words — in place.
 */
export function OrderCancelNotice({ children }: { children: ReactNode }) {
  const [cancelled, setCancelled] = useState<number | null>(null)
  const region = useRef<HTMLDivElement>(null)
  const value = useMemo<OrderCancelNoticeValue>(() => ({ cancelled, announce: setCancelled, region }), [cancelled])

  return <NoticeContext value={value}>{children}</NoticeContext>
}

/** The notice around this cancel, or null where a cancel has none. */
export function useOrderCancelNotice(): OrderCancelNoticeValue | null {
  return use(NoticeContext)
}
