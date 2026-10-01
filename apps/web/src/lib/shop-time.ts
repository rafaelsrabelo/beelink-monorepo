/**
 * The shop's own clock, for a form that asks "when": a `datetime-local` field holds a wall time with
 * no zone, and the wire wants an instant. The shops are Brazilian and Brasília has no summer time,
 * so the offset is a constant — the same one the API reads a customer's year with.
 */
const SHOP_OFFSET = "-03:00"
const SHOP_OFFSET_MS = 3 * 60 * 60 * 1000
const WALL_TIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/

/** An instant as the field shows it: `yyyy-mm-ddThh:mm` on the shop's clock. */
export function shopInputOf(instant: string | Date): string {
  return new Date(new Date(instant).getTime() - SHOP_OFFSET_MS).toISOString().slice(0, 16)
}

/** What the field holds as an ISO-8601 instant; null for an empty or half-typed value. */
export function instantOf(input: string): string | null {
  if (!WALL_TIME.test(input)) return null
  const instant = new Date(`${input}:00${SHOP_OFFSET}`)
  return Number.isNaN(instant.getTime()) ? null : instant.toISOString()
}

/** "1 de out. de 2026, 09:00": the day and the minute, on the shop's clock. */
export function shopMomentOf(instant: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" }).format(new Date(instant))
}
