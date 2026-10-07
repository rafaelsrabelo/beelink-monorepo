// Types
import type { MetaPixelConnection, MetaPixelTestEventResult } from "@harness-monorepo/contracts"
import type { MetaConversionsView, MetaPixelCardView, MetaTestEventView } from "@harness-monorepo/ui/lib/integrations"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

type MetaPixelText = UiMessages["integrations"]["metaPixel"]
type MetaConversionsText = UiMessages["integrations"]["metaConversions"]

/**
 * Meta's Events Manager, where a shopkeeper copies their pixel's ID from. Signed out, the address
 * leads to Meta's own login and back. A link only: nothing of Meta's is loaded by this page.
 */
export const META_EVENTS_MANAGER = "https://business.facebook.com/events_manager"

/** When the ID was saved, as the shop's country reads a date. */
function savedAtOf(iso: string, locale = "pt-BR"): string {
  return new Intl.DateTimeFormat(locale, { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "America/Sao_Paulo" }).format(new Date(iso))
}

/**
 * The card as the block draws it. Connected is an ID saved, and only that: any other status the wire
 * could carry reads as a shop with no pixel, which is the one thing its field can mend.
 */
export function metaPixelCardOf(connection: MetaPixelConnection): MetaPixelCardView {
  if (connection.status !== "CONNECTED" || connection.pixelId === null) return { pixelId: null, connectedAt: null, savedAt: null }
  return { pixelId: connection.pixelId, connectedAt: connection.connectedAt, savedAt: connection.connectedAt ? savedAtOf(connection.connectedAt) : null }
}

/** Why saving the ID did not go through, in words; own keys only, so a code that names a member of `Object` reads as any unknown one. */
export function metaPixelErrorOf(code: string, text: MetaPixelText["errors"]): string {
  return Object.hasOwn(text, code) ? text[code as keyof MetaPixelText["errors"]] : text.UNKNOWN
}

/**
 * The token's card as the block draws it (BEELINK-274). An answer kept from before the field existed
 * carries no `conversions`: it reads as a deployment that keeps none, which offers no field to fail.
 */
export function metaConversionsOf(connection: MetaPixelConnection): MetaConversionsView {
  const conversions = connection.conversions as MetaPixelConnection["conversions"] | undefined
  if (!conversions) return { available: false, token: "NONE", refusal: null }
  return { available: conversions.available, token: conversions.token, refusal: conversions.token === "REJECTED" ? (conversions.refusal ?? "TOKEN_REJECTED") : null }
}

/** Why saving the token did not go through, in words. */
export function metaTokenErrorOf(code: string, text: MetaConversionsText["errors"]): string {
  return Object.hasOwn(text, code) ? text[code as keyof MetaConversionsText["errors"]] : text.UNKNOWN
}

/** Why a test event was not made at all, in words. */
export function metaTestErrorOf(code: string, text: MetaConversionsText["test"]["errors"]): string {
  return Object.hasOwn(text, code) ? text[code as keyof MetaConversionsText["test"]["errors"]] : text.UNKNOWN
}

/** What Meta said of a test event, in words; Meta's own ride beside a refusal, and never beside an event it took. */
export function metaTestResultOf(result: MetaPixelTestEventResult, text: MetaConversionsText["test"]["outcomes"]): MetaTestEventView {
  const known = Object.hasOwn(text, result.outcome)
  const accepted = result.outcome === "ACCEPTED"
  return { tone: accepted ? "done" : "error", message: known ? text[result.outcome] : text.UNREACHABLE, detail: accepted ? null : result.detail }
}
