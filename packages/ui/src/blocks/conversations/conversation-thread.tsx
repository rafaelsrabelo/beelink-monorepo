"use client"

// React
import { useCallback, useEffect, useId, useRef, type ReactNode } from "react"

// Libs
import { ArrowLeftIcon } from "lucide-react"

// Utils
import { cn } from "@harness-monorepo/ui/lib/utils"

// Locales
import { defaultMessages } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import { AnchorLink, type LinkComponent } from "../auth/auth-link"

/** One message, already in the shopkeeper's words. */
export interface ConversationLine {
  id: string
  /** Written by the shop; the customer's are drawn on the other side. */
  mine: boolean
  /** What the customer was told of the order moving (BEELINK-236): drawn in the middle, belonging to neither side. */
  notice?: boolean
  body: string
  when: string
  /** "Enviada" or "Lida", under the shop's last message only. */
  seen?: string | null
}

export interface ConversationThreadProps {
  customer: string
  /** "Pedido nº 18" and its status, as the panel draws a status. */
  order: ReactNode
  orderHref?: string | null
  customerHref?: string | null
  /** Back to the list, on a phone where the conversation has the screen to itself. */
  backHref?: string | null
  lines: readonly ConversationLine[]
  /** `open` takes an answer; `closed` is history; `empty` waits for the customer; `none` ended with nothing said. */
  state: "open" | "closed" | "empty" | "none"
  reply?: ReactNode
  /** Its own title, when the conversation stands alone rather than inside an order. */
  headed?: boolean
  linkComponent?: LinkComponent
  messages?: UiMessages
}

/**
 * One order's conversation, as the shop reads it: the customer's messages on one side and the
 * shop's on the other, oldest first, and the answer under them — or why there is none to give.
 */
export function ConversationThread({ customer, order, orderHref, customerHref, backHref, lines, state, reply, headed = true, linkComponent: Link = AnchorLink, messages = defaultMessages }: ConversationThreadProps) {
  const text = messages.conversations
  // Opened from the list, the focused row is gone: the conversation's title takes its place.
  const heading = useRef<HTMLHeadingElement>(null)
  const headingId = useId()
  useEffect(() => {
    if (headed) heading.current?.focus()
  }, [headed])
  // Kept at the latest message as they arrive; a count that stays the same leaves the reader where they are.
  const scroller = useCallback(
    (element: HTMLDivElement | null) => {
      if (element && lines.length) element.scrollTop = element.scrollHeight
    },
    [lines.length],
  )

  return (
    <section {...(headed ? { "aria-labelledby": headingId } : { "aria-label": customer })} className="flex min-h-0 flex-1 flex-col gap-3">
      {headed ? (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          {backHref ? (
            <Link href={backHref} aria-label={text.back} className="hover:bg-muted -ml-1.5 rounded-md p-1.5 lg:hidden">
              <ArrowLeftIcon aria-hidden="true" className="size-4" />
            </Link>
          ) : null}
          <div className="flex min-w-0 flex-col">
            <h2 ref={heading} id={headingId} tabIndex={-1} className="focus-visible:ring-ring truncate rounded-sm text-base font-semibold outline-none focus-visible:ring-2">
              {customer}
            </h2>
            <div className="text-muted-foreground flex items-center gap-2 text-xs">{order}</div>
          </div>
          <div className="ml-auto flex gap-3 text-sm">
            {orderHref ? (
              <Link href={orderHref} className="text-primary hover:underline">
                {text.viewOrder}
              </Link>
            ) : null}
            {customerHref ? (
              <Link href={customerHref} className="text-primary hover:underline">
                {text.viewCustomer}
              </Link>
            ) : null}
          </div>
        </div>
      ) : null}

      {state === "empty" || state === "none" ? (
        <p className="text-muted-foreground py-6 text-center text-sm">{state === "empty" ? text.noneYet : text.noneClosed}</p>
      ) : (
        // A log: what arrives is read out; focusable, so a keyboard scrolls the history.
        <div ref={scroller} role="log" tabIndex={0} aria-label={text.title} className="focus-visible:ring-ring min-h-0 flex-1 overflow-y-auto rounded-md outline-none focus-visible:ring-2">
          <ol className="flex flex-col gap-2 py-1">
            {lines.map((line) =>
              line.notice ? (
                <li key={line.id} className="flex flex-col items-center gap-0.5 self-center py-1 text-center">
                  <p className="bg-muted rounded-full px-3 py-1 text-xs font-medium">{line.body}</p>
                  <span className="text-muted-foreground text-[11px]">{line.when}</span>
                </li>
              ) : (
              <li key={line.id} className={cn("flex max-w-[85%] flex-col gap-1", line.mine ? "items-end self-end" : "items-start self-start")}>
                <p className={cn("rounded-2xl px-3.5 py-2 text-sm break-words whitespace-pre-wrap", line.mine ? "bg-primary text-primary-foreground rounded-br-md" : "bg-muted rounded-bl-md")}>
                  <span className="sr-only">{line.mine ? text.fromShop : text.fromCustomer}: </span>
                  {line.body}
                </p>
                <span className="text-muted-foreground text-[11px]">
                  {line.when}
                  {line.seen ? ` · ${line.seen}` : null}
                </span>
              </li>
              ),
            )}
          </ol>
        </div>
      )}

      {state === "open" ? reply : state === "closed" ? <p className="bg-muted text-muted-foreground rounded-lg px-4 py-3 text-sm">{text.closed}</p> : null}
    </section>
  )
}
