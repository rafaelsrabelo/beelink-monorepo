// Types
import type { GoogleAnalyticsConnection } from "@harness-monorepo/contracts"
import type { GoogleAnalyticsCardView } from "@harness-monorepo/ui/lib/integrations"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

type GoogleAnalyticsText = UiMessages["integrations"]["googleAnalytics"]

/**
 * Google Analytics itself, where a shopkeeper copies the measurement ID from and reads the reports.
 * Signed out, the address leads to Google's own login and back. A link only: nothing of Google's is
 * loaded by this page.
 */
export const GOOGLE_ANALYTICS_HOME = "https://analytics.google.com/"

/** When the ID was saved, as the shop's country reads a date. */
function savedAtOf(iso: string, locale = "pt-BR"): string {
  return new Intl.DateTimeFormat(locale, { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "America/Sao_Paulo" }).format(new Date(iso))
}

/**
 * The card as the block draws it. Connected is an ID saved, and only that: any other status the wire
 * could carry reads as a shop with no ID, which is the one thing its field can mend.
 */
export function googleAnalyticsCardOf(connection: GoogleAnalyticsConnection): GoogleAnalyticsCardView {
  if (connection.status !== "CONNECTED" || connection.measurementId === null) return { measurementId: null, connectedAt: null, savedAt: null }
  return { measurementId: connection.measurementId, connectedAt: connection.connectedAt, savedAt: connection.connectedAt ? savedAtOf(connection.connectedAt) : null }
}

/** Why saving the ID did not go through, in words; own keys only, so a code that names a member of `Object` reads as any unknown one. */
export function googleAnalyticsErrorOf(code: string, text: GoogleAnalyticsText["errors"]): string {
  return Object.hasOwn(text, code) ? text[code as keyof GoogleAnalyticsText["errors"]] : text.UNKNOWN
}
