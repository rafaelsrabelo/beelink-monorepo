/*
  Time as a shop says it. A shop has no time zone of its own yet; the product is Brazilian, so every
  date shown to someone — a countdown's end, the field that sets it — is said in Brasília's, whatever
  zone the server or the visitor's phone is in. An instant is stored in UTC; only its words move.
*/

/** The zone every shop's dates are said in, until a shop can have its own. */
export const SHOP_TIME_ZONE = "America/Sao_Paulo"

/** The wall clock of an instant in a zone, as its parts. */
function partsIn(instant: number, zone: string): { year: number; month: number; day: number; hour: number; minute: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: zone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(instant))
  const value = (type: string) => Number(parts.find((part) => part.type === type)?.value ?? 0)

  return { year: value("year"), month: value("month"), day: value("day"), hour: value("hour"), minute: value("minute") }
}

/** How far a zone's clock is from UTC at an instant, in milliseconds: -3 h for Brasília. */
function offsetOf(instant: number, zone: string): number {
  const at = partsIn(instant, zone)
  return Date.UTC(at.year, at.month - 1, at.day, at.hour, at.minute) - Math.floor(instant / 60_000) * 60_000
}

const pad = (value: number) => String(value).padStart(2, "0")

/** "2026-09-30T23:59": what a `datetime-local` field holds, for an instant, on the zone's clock. */
export function wallTimeOf(iso: string, zone: string = SHOP_TIME_ZONE): string {
  const at = partsIn(Date.parse(iso), zone)
  return `${at.year}-${pad(at.month)}-${pad(at.day)}T${pad(at.hour)}:${pad(at.minute)}`
}

/**
 * The instant a wall time names on a zone's clock, in UTC — or null for one that is not a time. The
 * offset is asked twice: once at the guess, once at the answer, so a day a zone changes its clock
 * lands on the right side of the change.
 */
export function instantOf(wallTime: string, zone: string = SHOP_TIME_ZONE): string | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(wallTime)
  if (!match) return null

  const [, year, month, day, hour, minute] = match.map(Number) as [number, number, number, number, number, number]
  const guess = Date.UTC(year, month - 1, day, hour, minute)
  const first = guess - offsetOf(guess, zone)
  return new Date(guess - offsetOf(first, zone)).toISOString()
}

/** What is left until an instant, in whole seconds split as a countdown shows them; all zero once past. */
export function remainingOf(endsAt: number, now: number): { days: number; hours: number; minutes: number; seconds: number; total: number } {
  const total = Math.max(0, Math.floor((endsAt - now) / 1000))

  return {
    days: Math.floor(total / 86_400),
    hours: Math.floor((total % 86_400) / 3600),
    minutes: Math.floor((total % 3600) / 60),
    seconds: total % 60,
    total,
  }
}
