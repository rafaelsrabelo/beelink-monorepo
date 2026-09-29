"use client"

// React
import { useCallback, useEffect, useRef, type ReactNode } from "react"

// Libs
import { ArrowLeftIcon } from "lucide-react"

// Utils
import { cn } from "@harness-monorepo/ui/lib/utils"

// Locales
import { defaultMessages } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import { AnchorLink, type LinkComponent } from "../auth/auth-link"
import { openInPlace } from "./open-in-place"

/** One message, already in the shopper's words. */
export interface StorefrontConversationLine {
  id: string
  /** Written by the shopper; the shop's are drawn on the other side. */
  mine: boolean
  /** The order moving (BEELINK-236): drawn in the middle, belonging to neither side. */
  notice?: boolean
  /** Plain text, drawn as text, line breaks kept. */
  body: string
  when: string
  /** "Enviada" or "Lida", under the shopper's last message only. */
  seen?: string | null
}

export interface StorefrontConversationThreadProps {
  /** "Pedido nº 1042". */
  title: string
  orderHref: string
  /** Back to the list: its page, and opening it in place on a plain click. */
  back?: { href: string; onBack?: () => void } | null
  lines: readonly StorefrontConversationLine[]
  /** Delivered or cancelled: history, read only, and saying so where the composer would be. */
  closed: boolean
  /** The web's composer, while the conversation takes messages. */
  composer?: ReactNode
  /** Leaving for the order's page: the web closes the panel the conversation is in. */
  onViewOrder?: () => void
  linkComponent?: LinkComponent
  messages?: UiMessages
}

/**
 * One order's conversation: the shopper's messages on one side and the shop's on the other, oldest
 * first, and the composer under them — or, once the order is over, the words that it ended with it.
 */
export function StorefrontConversationThread({ title, orderHref, back, lines, closed, composer, onViewOrder, linkComponent: Link = AnchorLink, messages = defaultMessages }: StorefrontConversationThreadProps) {
  const text = messages.storefront
  // Kept at the latest message as they arrive; a count that stays the same leaves the reader where they are.
  // Arriving from the list, the focused row is gone: the conversation's title takes its place.
  const heading = useRef<HTMLHeadingElement>(null)
  useEffect(() => heading.current?.focus(), [])
  const scroller = useCallback(
    (element: HTMLDivElement | null) => {
      if (element && lines.length) element.scrollTop = element.scrollHeight
    },
    [lines.length],
  )

  return (
    <section aria-label={title} className="flex min-h-0 flex-1 flex-col gap-3 text-shop-on-background">
      <div className="flex items-center gap-2">
        {back ? (
          <Link href={back.href} aria-label={text.conversationsBack} onClick={(event) => openInPlace(event, back.onBack)} className="-ml-1.5 rounded-md p-1.5 hover:bg-shop-fill">
            <ArrowLeftIcon aria-hidden="true" className="size-5" />
          </Link>
        ) : null}
        <h3 ref={heading} tabIndex={-1} className="text-base font-extrabold outline-none">
          {title}
        </h3>
        <Link href={orderHref} onClick={onViewOrder} className="ml-auto text-sm font-semibold text-shop-primary-ink hover:underline">
          {text.conversationViewOrder}
        </Link>
      </div>

      {/* A log: what arrives is read out; focusable, so a keyboard scrolls the history. */}
      <div ref={scroller} role="log" tabIndex={0} aria-label={title} className="min-h-0 flex-1 overflow-y-auto rounded-md focus-visible:ring-2 focus-visible:ring-shop-primary focus-visible:outline-none">
        {lines.length === 0 && !closed ? <p className="py-6 text-center text-sm text-shop-muted">{text.conversationStart}</p> : null}
        <ol className="flex flex-col gap-2 py-1">
          {lines.map((line) =>
            line.notice ? (
              <li key={line.id} className="flex flex-col items-center gap-0.5 self-center py-1 text-center">
                <p className="rounded-full bg-shop-fill px-3 py-1 text-xs font-semibold text-shop-on-background">{line.body}</p>
                <span className="text-[11px] text-shop-muted">{line.when}</span>
              </li>
            ) : (
            <li key={line.id} className={cn("flex max-w-[85%] flex-col gap-1", line.mine ? "items-end self-end" : "items-start self-start")}>
              <p
                className={cn(
                  "rounded-2xl px-3.5 py-2 text-sm break-words whitespace-pre-wrap",
                  line.mine ? "rounded-br-md bg-shop-primary text-shop-on-primary" : "rounded-bl-md bg-shop-fill text-shop-on-background",
                )}
              >
                <span className="sr-only">{line.mine ? text.conversationFromYou : text.conversationFromShop}: </span>
                {line.body}
              </p>
              <span className="text-[11px] text-shop-muted">
                {line.when}
                {line.seen ? ` · ${line.seen}` : null}
              </span>
            </li>
            ),
          )}
        </ol>
      </div>

      {closed ? <p className="rounded-xl bg-shop-fill px-4 py-3 text-sm text-shop-muted">{text.conversationClosed}</p> : composer}
    </section>
  )
}
