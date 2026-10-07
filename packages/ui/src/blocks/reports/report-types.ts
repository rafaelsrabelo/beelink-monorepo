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
