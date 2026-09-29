"use client"

// React
import { useState } from "react"

// Libs
import { MessageCircleIcon, ShoppingBagIcon } from "lucide-react"

// UI
import { Popover, PopoverContent, PopoverTitle, PopoverTrigger } from "@harness-monorepo/ui/components/popover"

// Locales
import { defaultMessages } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import { AnchorLink, type LinkComponent } from "../auth/auth-link"
import { AdminBell } from "./admin-bell"

/** One thing that came in, every line already in the shopkeeper's words. */
export interface AdminNotification {
  id: string
  kind: "order" | "message"
  /** "Novo pedido nº 21", "Mensagem no pedido nº 18". */
  title: string
  /** Who, and the total or the message. */
  detail: string
  when: string
  href: string
}

export interface AdminNotificationsProps {
  /** What waits: unread messages and orders not accepted yet. */
  unread: number
  items: readonly AdminNotification[]
  /** Read for the first time: the menu draws its rows as shapes. */
  pending?: boolean
  /** The orders list, filtered to the new ones. */
  ordersHref?: string | null
  linkComponent?: LinkComponent
  messages?: UiMessages
}

/**
 * The bell and what it holds (BEELINK-163): the latest of what came in, most recent first, each
 * leading to its order. Base UI closes it on Esc and gives the focus back to the bell.
 */
export function AdminNotifications({ unread, items, pending = false, ordersHref = null, linkComponent: Link = AnchorLink, messages = defaultMessages }: AdminNotificationsProps) {
  const text = messages.shell
  // Closed on a pick too: the panel keeps its header across pages, and the menu would stay over the order it opened.
  const [open, setOpen] = useState(false)
  const close = () => setOpen(false)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger render={<AdminBell unread={unread} messages={messages} />} />
      <PopoverContent align="end" className="w-96 max-w-[calc(100vw-1rem)] gap-0 p-0">
        <PopoverTitle className="border-b px-3 py-2.5 text-sm font-semibold">{text.notificationsTitle}</PopoverTitle>
        {pending ? (
          <div aria-hidden="true" className="flex animate-pulse flex-col gap-3 p-3">
            {[0, 1, 2].map((row) => (
              <div key={row} className="flex gap-2.5">
                <div className="bg-muted size-7 rounded-full" />
                <div className="flex flex-1 flex-col gap-1.5">
                  <div className="bg-muted h-3.5 w-40 rounded" />
                  <div className="bg-muted h-3 w-52 rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : items.length === 0 ? (
          <p className="text-muted-foreground px-3 py-6 text-center text-sm">{text.notificationsEmpty}</p>
        ) : (
          <ul className="max-h-96 overflow-y-auto py-1">
            {items.map((item) => (
              <li key={item.id}>
                <Link href={item.href} onClick={close} className="hover:bg-muted focus-visible:bg-muted flex gap-2.5 px-3 py-2 outline-none">
                  <span className="bg-muted text-foreground grid size-7 shrink-0 place-items-center rounded-full">
                    {item.kind === "order" ? <ShoppingBagIcon aria-hidden="true" className="size-3.5" /> : <MessageCircleIcon aria-hidden="true" className="size-3.5" />}
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="text-sm font-medium">{item.title}</span>
                    <span className="text-muted-foreground truncate text-xs">{item.detail}</span>
                  </span>
                  <span className="text-muted-foreground shrink-0 text-[11px]">{item.when}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
        {ordersHref ? (
          <Link href={ordersHref} onClick={close} className="hover:bg-muted border-t px-3 py-2.5 text-center text-sm font-medium">
            {text.notificationsSeeOrders}
          </Link>
        ) : null}
      </PopoverContent>
    </Popover>
  )
}
