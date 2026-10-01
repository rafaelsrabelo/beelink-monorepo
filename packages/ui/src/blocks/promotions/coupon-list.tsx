// Libs
import { ListIcon, PauseIcon, PencilIcon, PlayIcon } from "lucide-react"

// UI
import { Badge } from "@harness-monorepo/ui/components/badge"
import { Button } from "@harness-monorepo/ui/components/button"

// Locales
import { defaultMessages, format } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import type { DiscountAudienceValue, DiscountStatusValue } from "@harness-monorepo/ui/lib/discount-form"
import { DiscountStatusBadge } from "./discount-status-badge"

export interface CouponListRow {
  id: string
  code: string
  /** "10%", "R$ 20,00" or "Frete grátis". */
  discount: string
  /** "Pedido mínimo de R$ 50,00"; null when it asks for none. */
  minimum: string | null
  period: string
  /** "3 de 100 usos". */
  uses: string
  status: DiscountStatusValue
  active: boolean
  audience: DiscountAudienceValue
}

export interface CouponListProps {
  rows: readonly CouponListRow[]
  empty: "none" | "filtered"
  /** The coupon whose pause or resume is on its way; every button waits meanwhile. */
  busyId?: string | null
  onEdit: (row: CouponListRow) => void
  onToggle: (row: CouponListRow) => void
  onUses: (row: CouponListRow) => void
  messages?: UiMessages
}

/**
 * The shop's coupons: each code with what it gives, what it asks for, its period, how many times it
 * was used and where it stands — and the owner's three moves: edit it, pause it, read its uses. One
 * that is for a first purchase only is marked beside what it gives.
 */
export function CouponList({ rows, empty, busyId = null, onEdit, onToggle, onUses, messages = defaultMessages }: CouponListProps) {
  const shared = messages.discounts
  const text = shared.coupons

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
              <p className="font-mono font-medium break-all">{row.code}</p>
              <DiscountStatusBadge status={row.status} label={text.status[row.status]} />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm">{[row.discount, row.minimum].filter(Boolean).join(" · ")}</p>
              {row.audience === "FIRST_PURCHASE" ? <Badge variant="secondary">{shared.firstPurchaseBadge}</Badge> : null}
            </div>
            <p className="text-muted-foreground text-xs">
              {row.period} · {row.uses}
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => onUses(row)} disabled={busyId !== null} aria-label={format(text.usesLabel, { code: row.code })}>
              <ListIcon />
              {text.viewUses}
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => onEdit(row)} disabled={busyId !== null} aria-label={format(text.editLabel, { code: row.code })}>
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
              aria-label={format(row.active ? text.pauseLabel : text.resumeLabel, { code: row.code })}
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
