// Utils
import { cn } from "@harness-monorepo/ui/lib/utils"

// Locales
import { defaultMessages, format } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import { AnchorLink, type LinkComponent } from "../auth/auth-link"

/** One of the shop's conversations, every line already in the shopkeeper's words. */
export interface ConversationListRow {
  number: number
  customer: string
  /** "Pedido nº 18 · Em preparo". */
  order: string
  /** The last message, "Você: …" when the shop wrote it. */
  preview: string
  when: string
  unread: number
  closed: boolean
  href: string
}

export interface ConversationListProps {
  rows: readonly ConversationListRow[]
  /** The order whose conversation is open beside the list. */
  current?: number | null
  linkComponent?: LinkComponent
  messages?: UiMessages
}

/** The shop's conversations: who, which order, the last line and when, and what waits unread. */
export function ConversationList({ rows, current = null, linkComponent: Link = AnchorLink, messages = defaultMessages }: ConversationListProps) {
  const text = messages.conversations

  if (rows.length === 0) {
    return (
      <div className="flex flex-col gap-1 px-2 py-10 text-center">
        <p className="font-medium">{text.empty}</p>
        <p className="text-muted-foreground text-sm">{text.emptyHint}</p>
      </div>
    )
  }

  return (
    <ul className="divide-border flex flex-col divide-y">
      {rows.map((row) => (
        <li key={row.number}>
          <Link
            href={row.href}
            aria-current={row.number === current ? "true" : undefined}
            className={cn("hover:bg-muted flex items-start gap-3 px-3 py-3", row.number === current && "bg-muted")}
          >
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="flex items-center gap-2">
                <span className={cn("truncate text-sm", row.unread > 0 ? "font-semibold" : "font-medium")}>{row.customer}</span>
                {row.closed ? <span className="bg-muted text-muted-foreground rounded-full px-2 py-0.5 text-[11px] font-medium">{text.closedTag}</span> : null}
              </span>
              <span className="text-muted-foreground text-xs">{row.order}</span>
              <span className={cn("truncate text-sm", row.unread > 0 ? "text-foreground" : "text-muted-foreground")}>{row.preview}</span>
            </span>
            <span className="flex shrink-0 flex-col items-end gap-1">
              <span className="text-muted-foreground text-[11px]">{row.when}</span>
              {row.unread > 0 ? (
                <span className="bg-primary text-primary-foreground flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-semibold">
                  <span aria-hidden="true">{row.unread > 99 ? "99+" : row.unread}</span>
                  <span className="sr-only">{row.unread === 1 ? text.unreadOne : format(text.unreadMany, { count: String(row.unread) })}</span>
                </span>
              ) : null}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  )
}
