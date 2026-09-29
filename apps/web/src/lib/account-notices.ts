// Types
import type { CustomerNotifications } from "@harness-monorepo/contracts"

/** A refused save of the notices, as its code. */
export const NOTICES_ERROR_KEY = "erro-avisos"
/** The save's word under the shared `aviso`. */
export const NOTICES_SAVED = "avisos-salvos"

/** When the shopper said yes to offers, as the reader writes a day in the shop's time zone; null unless they did. */
export function offersSinceOf(notifications: CustomerNotifications, locale: string): string | null {
  if (!notifications.offers || !notifications.offersChosenAt) return null
  return new Intl.DateTimeFormat(locale, { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "America/Sao_Paulo" }).format(new Date(notifications.offersChosenAt))
}
