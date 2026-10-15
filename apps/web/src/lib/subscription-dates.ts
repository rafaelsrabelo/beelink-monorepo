/*
  The days a page's subscription is told in on the Assinar screen (BEELINK-293), on Brasília's
  calendar — the API's rule (`apps/api/src/modules/billing/billing-dates.ts`), restated for what the
  screen shows and never for what is charged: Asaas's calendar is the one that counts.

  A day is `YYYY-MM-DD`. An end is an instant and exclusive — the first instant a thing is over.
*/

const DAY = /^(\d{4})-(\d{2})-(\d{2})$/
/** Brasília keeps no summer time since 2019: its day is UTC's, three hours later. */
const BRASILIA_OFFSET_MS = 3 * 3_600_000

const dayAt = (ms: number): string => new Date(ms).toISOString().slice(0, 10)

/** The day it is in Brasília at an instant: 22h there is still today, though UTC is already tomorrow. */
export function brasiliaDayOf(at: Date): string {
  return dayAt(at.getTime() - BRASILIA_OFFSET_MS)
}

/** The last day something that ends at `endsAt` — an ISO instant, exclusive — still covers. */
export function lastDayBefore(endsAt: string): string {
  return brasiliaDayOf(new Date(new Date(endsAt).getTime() - 1))
}

/**
 * The day a cycle of `months` months begun on `day` renews: the same day of the month, or the month's
 * last day where it lacks that one — 31/10 renews on 30/11 a month on, on 30/04 six months on.
 */
export function renewalDayOf(day: string, months: number): string {
  const match = DAY.exec(day)
  if (!match) throw new RangeError(`"${day}" is not a day (YYYY-MM-DD)`)

  const monthsSince = Number(match[2]) - 1 + months
  const year = Number(match[1]) + Math.floor(monthsSince / 12)
  const month = monthsSince % 12
  // Day 0 of the month after is this month's last day.
  const lastOfMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate()

  return dayAt(Date.UTC(year, month, Math.min(Number(match[3]), lastOfMonth)))
}

/** A day as the reader's language writes it — 15/11/2026, 11/15/2026 — whatever the browser's own zone. */
export function dayInWords(day: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "UTC" }).format(new Date(`${day}T00:00:00.000Z`))
}
