// Types
import type { SalesByOriginQuery } from "@harness-monorepo/contracts"

/** Brasília keeps no summer time: the offset `lib/shop-time.ts` and the API read the shop's clock with. */
const SHOP_OFFSET_MS = 3 * 60 * 60 * 1000
const DAY_MS = 86_400_000

/** The periods the report offers, in days ending today. A date picker is the sales reports' to bring. */
export const REPORT_PERIODS = [7, 30, 90] as const
export type ReportPeriodDays = (typeof REPORT_PERIODS)[number]
export const REPORT_DEFAULT_PERIOD: ReportPeriodDays = 30

/** The period the address asks for. One it cannot mean is read as the default, never sent to the API to refuse. */
export function reportPeriodOf(params: Pick<URLSearchParams, "get">): ReportPeriodDays {
  return REPORT_PERIODS.find((days) => String(days) === params.get("period")) ?? REPORT_DEFAULT_PERIOD
}

/** The panel's pages of reports. Every link to them is built here. */
export function reportPagesOf(slug: string): { home: string; origins: string } {
  const home = `/admin/${encodeURIComponent(slug)}/reports`
  return { home, origins: `${home}/origins` }
}

/** The sales by origin with a period on its address; the default stays out of it. */
export function salesByOriginHref(slug: string, days: ReportPeriodDays): string {
  const { origins } = reportPagesOf(slug)
  return days === REPORT_DEFAULT_PERIOD ? origins : `${origins}?period=${days}`
}

/** That many days ending today, as the two days the API takes: on the shop's clock, both counted. */
export function reportDaysOf(days: ReportPeriodDays, now: Date): Required<SalesByOriginQuery> {
  const today = now.getTime() - SHOP_OFFSET_MS
  const day = (at: number) => new Date(at).toISOString().slice(0, 10)

  return { from: day(today - (days - 1) * DAY_MS), to: day(today) }
}

/** "06/10/2026" for the day "2026-10-06" — a day with no zone, said as itself. */
export function reportDayText(day: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "UTC" }).format(new Date(`${day}T00:00:00.000Z`))
}

/**
 * A link to the shop's own address carrying the three campaign labels, for the report to show how
 * an origin gets recorded. `origin` is the site's public one.
 */
export function originExampleUrl(origin: string, slug: string): string {
  return `${origin}/${encodeURIComponent(slug)}?utm_source=instagram&utm_medium=social&utm_campaign=minha-campanha`
}
