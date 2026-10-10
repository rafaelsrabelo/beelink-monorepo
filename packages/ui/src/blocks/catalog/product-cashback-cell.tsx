"use client"

// UI
import { Button } from "@harness-monorepo/ui/components/button"
import { ratePercentOf } from "@harness-monorepo/ui/lib/cashback"

// Locales
import { defaultLocale, defaultMessages } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

export interface ProductCashbackCellProps {
  /** The product's name, which the button is named by: a column of them reads the same otherwise. */
  name: string
  /** Its own cashback in basis points; null has none. */
  rateBps: number | null
  onAdd: () => void
  disabled?: boolean
  locale?: string
  messages?: UiMessages
}

/**
 * A product's cashback in the panel's list (BEELINK-313), in a shop that gives it by product: its
 * rate, or — with none, which there earns nothing — the way to give it one.
 */
export function ProductCashbackCell({ name, rateBps, onAdd, disabled = false, locale = defaultLocale, messages = defaultMessages }: ProductCashbackCellProps) {
  const text = messages.catalog.products.table

  if (rateBps !== null) return <span className="tabular-nums">{ratePercentOf(rateBps, locale)}</span>

  return (
    <Button type="button" variant="outline" size="sm" aria-label={`${text.addCashback}: ${name}`} onClick={onAdd} disabled={disabled}>
      {text.addCashback}
    </Button>
  )
}
