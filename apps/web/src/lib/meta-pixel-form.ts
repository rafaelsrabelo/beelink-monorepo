// Types
import type { MetaPixelConnection } from "@harness-monorepo/contracts"
import type { MetaPixelCardView } from "@harness-monorepo/ui/lib/integrations"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

type MetaPixelText = UiMessages["integrations"]["metaPixel"]

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
