// Types
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// UI
import { format } from "@harness-monorepo/ui/locales/index"

/** A day of the shop's calendar at midday UTC, so no reader's clock moves it across midnight. */
function dayOf(iso: string): Date {
  return new Date(`${iso}T12:00:00.000Z`)
}

/**
 * The window a delivery should arrive in, as a sentence: "Chega entre qui., 25 e sex., 26 de set.",
 * the month said once when both days share it, and "Chega qui., 25 de set." for a single day.
 */
export function estimateLineOf(window: { from: string; to: string }, locale: string, messages: UiMessages): string {
  const text = messages.storefront
  const full = new Intl.DateTimeFormat(locale, { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" })
  const short = new Intl.DateTimeFormat(locale, { weekday: "short", day: "numeric", timeZone: "UTC" })
  const from = dayOf(window.from)
  const to = dayOf(window.to)

  if (window.from === window.to) return format(text.orderEstimateDay, { day: full.format(from) })
  const sameMonth = window.from.slice(0, 7) === window.to.slice(0, 7)
  return format(text.orderEstimateRange, { from: (sameMonth ? short : full).format(from), to: full.format(to) })
}
