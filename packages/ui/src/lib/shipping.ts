// Locales
import { format } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

/** A quoted window as the blocks read it. Mirrors the wire's `ShippingWindow`; this package imports no contracts. */
export interface ShippingWindowValue {
  unit: "MINUTES" | "BUSINESS_DAYS"
  from: number
  to: number
}

type Text = Pick<UiMessages["storefront"], "windowMinutes" | "windowMinutesOne" | "windowHours" | "windowHoursOne" | "windowDays" | "windowDaysOne">

/** Past these, a shop that set its bands in minutes meant hours, and then days. */
const HOURS_FROM_MINUTES = 120
const DAYS_FROM_MINUTES = 48 * 60

const spanOf = (from: number, to: number, range: string, one: string) => (from === to ? format(one, { count: String(from) }) : format(range, { from: String(from), to: String(to) }))

/**
 * The shop's own window in words (BEELINK-178): "30–50 min", "2–3 h" from two hours up, "2–4 dias"
 * from two days up — the bands are set in minutes up to a week, and "2880 min" is nobody's promise.
 * Hours and days round outwards: the early end down, the late end up, so the words never promise
 * sooner than the shop did.
 */
export function minutesWindowText(from: number, to: number, text: Text): string {
  if (to < HOURS_FROM_MINUTES) return spanOf(from, to, text.windowMinutes, text.windowMinutesOne)
  const per = to < DAYS_FROM_MINUTES ? 60 : 24 * 60
  const [range, one] = to < DAYS_FROM_MINUTES ? [text.windowHours, text.windowHoursOne] : [text.windowDays, text.windowDaysOne]
  return spanOf(Math.floor(from / per), Math.ceil(to / per), range, one)
}

/** A quoted window in words; null for one this version has no words for yet — a carrier's, in business days. */
export function windowText(window: ShippingWindowValue, text: Text): string | null {
  return window.unit === "MINUTES" ? minutesWindowText(window.from, window.to, text) : null
}

/** "2,6 km", "800 m": a distance as a person says it. */
export function distanceText(metres: number, locale: string): string {
  if (metres < 1000) return `${metres} m`
  return `${new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(metres / 1000)} km`
}
