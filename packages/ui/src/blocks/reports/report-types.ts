// Locales
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

/**
 * The shapes the report blocks draw, restated here rather than imported from the wire: this package
 * declares no dependency on the contracts. Mirrors `SalesByOriginRow`.
 */
export type SalesOriginKind = "CAMPAIGN" | "DIRECT" | "PANEL"

export interface SalesByOriginRowView {
  kind: SalesOriginKind
  source: string | null
  medium: string | null
  /** Written by whoever made the link: drawn as text, never as markup. */
  campaign: string | null
  orders: number
  /** How many of them came by a Meta ad click that was kept. */
  metaAdOrders: number
  revenueCents: number
}

export interface SalesTotalsView {
  orders: number
  revenueCents: number
}

/** What the table and the cards both draw. */
export interface SalesByOriginRowsProps {
  /** In the order they are drawn: the API sends the highest revenue first. */
  rows: readonly SalesByOriginRowView[]
  totals: SalesTotalsView
  /** Which period these numbers are of, for a screen reader: the table's caption, the list's name. */
  caption: string
  locale?: string
  messages?: UiMessages
}
