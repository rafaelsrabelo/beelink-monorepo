// Locales
import { format } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Lib
import { originLinesOf } from "@harness-monorepo/ui/lib/order-origin"

// Block
import type { SalesByOriginRowView } from "./report-types"

export interface SalesOriginLabel {
  /** "facebook / cpc · campanha teste", "Anúncio da Meta", "Direto / sem campanha" or "Venda registrada no painel". */
  line: string
  /** "1 de 3 pedidos com clique em anúncio da Meta"; null where no click was kept, or the line already says it. */
  detail: string | null
}

/**
 * A report line's origin in the words an order's page uses (BEELINK-275): the same `originLinesOf`,
 * so "facebook / cpc · campanha teste" reads alike in both places.
 *
 * A campaign's line never opens with "Anúncio da Meta": only some of its orders may have come by a
 * kept click, and how many is said under it. A line with no label at all is made of those clicks
 * alone, and is named by them.
 */
export function salesOriginLabelOf(row: SalesByOriginRowView, messages: UiMessages): SalesOriginLabel {
  const text = messages.reports.salesByOrigin
  const origin = messages.orders.detail.origin

  if (row.kind === "PANEL") return { line: text.panel, detail: null }
  if (row.kind === "DIRECT") return { line: originLinesOf(null, origin).line, detail: null }

  const labelled = row.source !== null || row.medium !== null || row.campaign !== null
  const { line } = originLinesOf({ source: row.source, medium: row.medium, campaign: row.campaign, content: null, term: null, metaAd: !labelled }, origin)
  const detail = labelled && row.metaAdOrders > 0 ? format(text.metaAdOrders, { count: String(row.metaAdOrders), total: String(row.orders) }) : null

  return { line, detail }
}

/** "62,5%": a line's part of the period's revenue; null when nothing was sold for money. */
export function revenueShareOf(revenueCents: number, totalCents: number, locale: string): string | null {
  if (totalCents <= 0) return null
  return new Intl.NumberFormat(locale, { style: "percent", maximumFractionDigits: 1 }).format(revenueCents / totalCents)
}
