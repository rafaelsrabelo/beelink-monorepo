/** The CPF as a person writes it, "529.982.247-25" — the record keeps its eleven digits — or null when none is on file. */
export function cpfLineOf(cpf: string | null): string | null {
  if (!cpf) return null
  return /^\d{11}$/.test(cpf) ? `${cpf.slice(0, 3)}.${cpf.slice(3, 6)}.${cpf.slice(6, 9)}-${cpf.slice(9)}` : cpf
}

/**
 * A birth date as the reader writes dates, "17/05/1990", or null when none is on file. The wire's
 * `YYYY-MM-DD` is a day, not an instant: it is read and written in UTC, or a reader west of
 * Greenwich would be shown the day before.
 */
export function birthDateLineOf(day: string | null, locale: string): string | null {
  if (!day) return null
  const date = new Date(`${day}T00:00:00.000Z`)
  if (Number.isNaN(date.getTime())) return day
  return new Intl.DateTimeFormat(locale, { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "UTC" }).format(date)
}

/**
 * Today in São Paulo, `YYYY-MM-DD`: the last day the birth date's picker offers — the same today the
 * API checks a birth date against, so the picker offers no day the API would refuse.
 */
export function brazilTodayOf(now: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now)
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((each) => each.type === type)?.value ?? ""
  return `${part("year")}-${part("month")}-${part("day")}`
}
