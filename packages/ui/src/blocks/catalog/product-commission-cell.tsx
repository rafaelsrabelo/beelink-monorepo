"use client"

// UI
import { Button } from "@harness-monorepo/ui/components/button"
import { ratePercentOf } from "@harness-monorepo/ui/lib/cashback"

// Locales
import { defaultLocale, defaultMessages, format } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

export interface ProductCommissionCellProps {
  /** The product's name, which the button is named by: a column of them reads the same otherwise. */
  name: string
  /** Its own rate on the default table, in basis points; null pays the table's. */
  rateBps: number | null
  defaultRateBps: number
  onEdit: () => void
  disabled?: boolean
  locale?: string
  messages?: UiMessages
}

/**
 * A product's affiliate commission in the panel's list (IMPULSEIA-102): its own rate on the default
 * table, or the table's, marked as such. Every product pays something — 0 included — so the cell is
 * always the way to the field, never an offer to add one.
 */
export function ProductCommissionCell({ name, rateBps, defaultRateBps, onEdit, disabled = false, locale = defaultLocale, messages = defaultMessages }: ProductCommissionCellProps) {
  const text = messages.catalog.products.table

  return (
    <Button type="button" variant="ghost" size="sm" className="tabular-nums" aria-label={format(text.editCommission, { name })} onClick={onEdit} disabled={disabled}>
      {rateBps === null ? (
        <span className="text-muted-foreground">{format(text.commissionDefault, { rate: ratePercentOf(defaultRateBps, locale) })}</span>
      ) : (
        ratePercentOf(rateBps, locale)
      )}
    </Button>
  )
}
