// Locales
import { defaultMessages, format } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

export interface StoreFunnelRemarksProps {
  /** Sales registered in the panel on the days counted: said apart, as they are no step. */
  panelSales: number
  /** The shop's first counted day, as a date, when it falls inside the period; null otherwise. */
  countingSince: string | null
  locale?: string
  messages?: UiMessages
}

/**
 * What this period's funnel leaves out, said right under it (BEELINK-276): the days before the shop
 * counted anything, and the sales that never came through the site. Draws nothing when neither
 * applies.
 */
export function StoreFunnelRemarks({ panelSales, countingSince, locale = "pt-BR", messages = defaultMessages }: StoreFunnelRemarksProps) {
  const text = messages.reports.funnel
  if (!countingSince && panelSales <= 0) return null

  return (
    <div className="text-muted-foreground flex flex-col gap-1 text-sm">
      {countingSince ? <p>{format(text.countingSince, { day: countingSince })}</p> : null}
      {panelSales > 0 ? <p>{panelSales === 1 ? text.panelSalesOne : format(text.panelSalesMany, { count: new Intl.NumberFormat(locale).format(panelSales) })}</p> : null}
    </div>
  )
}
