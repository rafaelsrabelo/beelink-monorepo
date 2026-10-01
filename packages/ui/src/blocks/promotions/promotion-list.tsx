// Libs
import { PauseIcon, PencilIcon, PlayIcon } from "lucide-react"

// UI
import { Badge } from "@harness-monorepo/ui/components/badge"
import { Button } from "@harness-monorepo/ui/components/button"

// Locales
import { defaultMessages, format } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import type { DiscountAudienceValue } from "@harness-monorepo/ui/lib/discount-form"
import { DiscountStatusBadge } from "./discount-status-badge"

export interface PromotionListRow {
  id: string
  name: string
  /** "10% no carrinho inteiro", already in the owner's words. */
  summary: string
  /** "De 1 out a 15 out". */
  period: string
  status: "ACTIVE" | "SCHEDULED" | "PAUSED" | "ENDED"
  /** The owner's switch, whatever the status reads: an ended promotion can still be paused. */
  active: boolean
  audience: DiscountAudienceValue
}

export interface PromotionListProps {
  rows: readonly PromotionListRow[]
  /** Why there are none: the shop has none yet, or none in the status chosen. */
  empty: "none" | "filtered"
  /** The promotion whose pause or resume is on its way. Every button waits meanwhile: two at once would race on the counts. */
  busyId?: string | null
  onEdit: (row: PromotionListRow) => void
  onToggle: (row: PromotionListRow) => void
  messages?: UiMessages
}

/**
 * The shop's promotions: each with what it takes off and where, its period, where it stands, and
 * the two things the owner does from the list — edit it, and pause it or switch it back on. One
 * that is for a first purchase only is marked beside what it takes off.
 */
export function PromotionList({ rows, empty, busyId = null, onEdit, onToggle, messages = defaultMessages }: PromotionListProps) {
  const shared = messages.discounts
  const text = shared.promotions

  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center gap-1 px-4 py-12 text-center">
        <p className="text-sm font-medium">{empty === "none" ? text.empty : text.emptyFiltered}</p>
        {empty === "none" ? <p className="text-muted-foreground text-sm">{text.emptyHint}</p> : null}
      </div>
    )
  }

  return (
    <ul className="divide-y">
      {rows.map((row) => (
        <li key={row.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:gap-4">
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-medium break-words">{row.name}</p>
              <DiscountStatusBadge status={row.status} label={text.status[row.status]} />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm">{row.summary}</p>
              {row.audience === "FIRST_PURCHASE" ? <Badge variant="secondary">{shared.firstPurchaseBadge}</Badge> : null}
            </div>
            <p className="text-muted-foreground text-xs">{row.period}</p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => onEdit(row)} disabled={busyId !== null} aria-label={format(text.editLabel, { name: row.name })}>
              <PencilIcon />
              {shared.edit}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onToggle(row)}
              disabled={busyId !== null}
              aria-busy={busyId === row.id || undefined}
              aria-label={format(row.active ? text.pauseLabel : text.resumeLabel, { name: row.name })}
            >
              {row.active ? <PauseIcon /> : <PlayIcon />}
              {row.active ? shared.pause : shared.resume}
            </Button>
          </div>
        </li>
      ))}
    </ul>
  )
}
