"use client"

// Utils
import { cn } from "@harness-monorepo/ui/lib/utils"

// Locales
import { defaultMessages, format } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import { AnchorLink, type LinkComponent } from "../auth/auth-link"
import { openInPlace } from "./open-in-place"

/** One conversation in the list, every line already in the shopper's words. */
export interface StorefrontConversationRow {
  number: number
  /** "Pedido nº 1042". */
  title: string
  /** The last message, "Você: …" when the shopper wrote it. */
  preview: string
  /** When it was written: "29 de set., 10:40". */
  when: string
  unread: number
  /** Delivered or cancelled: history now. */
  closed: boolean
  /** This conversation on its own page. */
  href: string
}

export interface StorefrontConversationListProps {
  rows: readonly StorefrontConversationRow[]
  /** Opens one in place, on a plain click; without it every row is a plain link. */
  onSelect?: (number: number) => void
  linkComponent?: LinkComponent
  messages?: UiMessages
}

/**
 * The shopper's conversations at the shop, as the API orders them: those still taking messages
 * first. Each row names its order, the last line, when, and how many from the shop wait unread.
 */
export function StorefrontConversationList({ rows, onSelect, linkComponent: Link = AnchorLink, messages = defaultMessages }: StorefrontConversationListProps) {
  const text = messages.storefront

  if (rows.length === 0) {
    return (
      <div className="flex flex-col gap-1 px-1 py-6 text-center">
        <p className="font-bold text-shop-on-background">{text.conversationsEmpty}</p>
        <p className="text-sm text-shop-muted">{text.conversationsEmptyHint}</p>
      </div>
    )
  }

  return (
    <ul className="flex flex-col divide-y divide-shop-line">
      {rows.map((row) => (
        <li key={row.number}>
          <Link
            href={row.href}
            onClick={(event) => openInPlace(event, onSelect ? () => onSelect(row.number) : undefined)}
            className="flex items-start gap-3 rounded-lg px-2 py-3 text-shop-on-background hover:bg-shop-fill"
          >
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="flex items-center gap-2">
                <span className={cn("text-sm", row.unread > 0 ? "font-extrabold" : "font-bold")}>{row.title}</span>
                {row.closed ? (
                  <span className="rounded-full bg-shop-fill px-2 py-0.5 text-[11px] font-semibold text-shop-muted">{text.conversationClosedTag}</span>
                ) : null}
              </span>
              <span className={cn("truncate text-sm", row.unread > 0 ? "text-shop-on-background" : "text-shop-muted")}>{row.preview}</span>
            </span>
            <span className="flex shrink-0 flex-col items-end gap-1">
              <span className="text-xs text-shop-muted">{row.when}</span>
              {row.unread > 0 ? (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-shop-primary px-1.5 text-[11px] font-bold text-shop-on-primary">
                  <span aria-hidden="true">{row.unread > 99 ? "99+" : row.unread}</span>
                  <span className="sr-only">{row.unread === 1 ? text.conversationUnreadOne : format(text.conversationUnreadMany, { count: String(row.unread) })}</span>
                </span>
              ) : null}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  )
}
