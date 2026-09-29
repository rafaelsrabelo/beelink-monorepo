"use client"

// React
import { useCallback, type ReactNode } from "react"

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
  linkComponent?: LinkComponent
  messages?: UiMessages
}

/**
 * One order's conversation: the shopper's messages on one side and the shop's on the other, oldest
 * first, and the composer under them — or, once the order is over, the words that it ended with it.
 */
export function StorefrontConversationThread({ title, orderHref, back, lines, closed, composer, linkComponent: Link = AnchorLink, messages = defaultMessages }: StorefrontConversationThreadProps) {
  const text = messages.storefront
  // Kept at the latest message as they arrive; a count that stays the same leaves the reader where they are.
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
        <h3 className="text-base font-extrabold">{title}</h3>
        <Link href={orderHref} className="ml-auto text-sm font-semibold text-shop-primary-ink hover:underline">
          {text.conversationViewOrder}
        </Link>
      </div>

      <div ref={scroller} className="min-h-0 flex-1 overflow-y-auto">
        {lines.length === 0 && !closed ? <p className="py-6 text-center text-sm text-shop-muted">{text.conversationStart}</p> : null}
        <ol className="flex flex-col gap-2 py-1">
          {lines.map((line) => (
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
          ))}
        </ol>
      </div>

      {closed ? <p className="rounded-xl bg-shop-fill px-4 py-3 text-sm text-shop-muted">{text.conversationClosed}</p> : composer}
    </section>
  )
}
