// Types
import type { DeliveryBand, DeliverySettings, DeliverySettingsPayload, MelhorEnvioConnection, StoreAddress } from "@harness-monorepo/contracts"
import type { DeliveryBandFormRow, DeliveryCarriersView, DeliverySettingsFormValues, DeliverySettingsIssues } from "@harness-monorepo/ui/lib/delivery"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// UI
import { centsFromStrict, reaisFrom } from "@harness-monorepo/ui/lib/money"
import { format } from "@harness-monorepo/ui/locales/index"

/**
 * The crossing between the store settings' Delivery tab (BEELINK-177) — strings, in kilometres,
 * reais and minutes — and the wire: metres, whole cents and minutes. The rules are the API's own
 * (BEELINK-175); saying them here first spares a round trip, and the API still has the last word.
 */

type Text = UiMessages["delivery"]

const REACH_MAX_METERS = 200_000
const AMOUNT_MAX_CENTS = 100_000_000
const WINDOW_MAX_MINUTES = 7 * 24 * 60
/** "3", "3,5", "0.8": kilometres, to the metre at most. */
const KILOMETRES = /^\d{1,3}([.,]\d{1,3})?$/
const MINUTES = /^\d{1,5}$/

function metresFrom(typed: string): number | null {
  const trimmed = typed.trim()
  if (!KILOMETRES.test(trimmed)) return null
  const metres = Math.round(Number(trimmed.replace(",", ".")) * 1000)
  return metres >= 1 && metres <= REACH_MAX_METERS ? metres : null
}

function minutesFrom(typed: string): number | null {
  const trimmed = typed.trim()
  const minutes = MINUTES.test(trimmed) ? Number(trimmed) : null
  return minutes !== null && minutes <= WINDOW_MAX_MINUTES ? minutes : null
}

function feeFrom(typed: string): number | null {
  const cents = centsFromStrict(typed)
  return cents !== null && cents <= AMOUNT_MAX_CENTS ? cents : null
}

/** "3", "3,5", "0,8" — what the field shows for a reach in metres. */
export function kilometresOf(metres: number): string {
  return String(metres / 1000).replace(".", ",")
}

/** A row read whole, or null while any of it does not; whether it fits beside the others is not asked here. */
function bandOf(row: DeliveryBandFormRow): DeliveryBand | null {
  const upToMeters = metresFrom(row.upToKm)
  const feeCents = feeFrom(row.fee)
  const windowFromMinutes = minutesFrom(row.windowFrom)
  const windowToMinutes = minutesFrom(row.windowTo)
  if (upToMeters === null || feeCents === null || windowFromMinutes === null || windowToMinutes === null) return null
  return { upToMeters, feeCents, windowFromMinutes, windowToMinutes }
}

export function deliveryFormOf(settings: DeliverySettings): DeliverySettingsFormValues {
  return {
    pickupEnabled: settings.pickupEnabled,
    ownDeliveryEnabled: settings.ownDeliveryEnabled,
    carriersEnabled: settings.carriersEnabled,
    bands: settings.bands.map((band) => ({
      upToKm: kilometresOf(band.upToMeters),
      fee: reaisFrom(band.feeCents),
      windowFrom: String(band.windowFromMinutes),
      windowTo: String(band.windowToMinutes),
    })),
    freeAbove: settings.freeAboveCents === null ? "" : reaisFrom(settings.freeAboveCents),
  }
}

/** A row read and set beside the one before it, or why it cannot be. */
function bandRefusalOf(row: DeliveryBandFormRow, at: number, previous: DeliveryBand | undefined, text: Text["issues"]): DeliveryBand | string {
  const index = String(at + 1)
  if (Object.values(row).some((typed) => typed.trim() === "")) return format(text.band, { index })
  const band = bandOf(row)
  if (!band) return format(text.range, { index })
  if (band.windowFromMinutes > band.windowToMinutes) return format(text.window, { index })
  if (previous && band.upToMeters <= previous.upToMeters) return format(text.order, { index, previous: String(at) })
  return band
}

/**
 * The tab as the API takes it, or what to correct, row by row. With the shop's own delivery switched
 * off its bands are hidden, so what was saved before is sent back untouched: a row nobody can see is
 * not a row anybody should be asked to fix.
 */
export function deliveryPayloadOf(value: DeliverySettingsFormValues, saved: DeliverySettings, text: Text["issues"]): { payload: DeliverySettingsPayload } | { issues: DeliverySettingsIssues } {
  const modes = { pickupEnabled: value.pickupEnabled, ownDeliveryEnabled: value.ownDeliveryEnabled, carriersEnabled: value.carriersEnabled }
  if (!value.ownDeliveryEnabled) return { payload: { ...modes, bands: saved.bands, freeAboveCents: saved.freeAboveCents } }

  const rowIssues: Partial<Record<number, string>> = {}
  const bands: DeliveryBand[] = []
  value.bands.forEach((row, at) => {
    const read = bandRefusalOf(row, at, bands.at(-1), text)
    if (typeof read === "string") rowIssues[at] = read
    else bands.push(read)
  })

  const blank = value.freeAbove.trim() === ""
  const freeAboveCents = blank ? null : centsFromStrict(value.freeAbove)
  const freeAboveHolds = blank || (freeAboveCents !== null && freeAboveCents >= 1 && freeAboveCents <= AMOUNT_MAX_CENTS)

  const issues: DeliverySettingsIssues = {
    ...(Object.keys(rowIssues).length > 0 ? { bands: rowIssues } : {}),
    ...(freeAboveHolds ? {} : { freeAbove: text.freeAbove }),
  }
  if (issues.bands || issues.freeAbove) return { issues }
  return { payload: { ...modes, bands, freeAboveCents } }
}

/** Each row in words once it reads — "Até 3 km: R$ 5,00, chega em 30–50 min." — and null while it does not. */
export function deliveryPreviewsOf(value: DeliverySettingsFormValues, money: (cents: number) => string, text: Text): (string | null)[] {
  return value.bands.map((row) => {
    const band = bandOf(row)
    if (!band || band.windowFromMinutes > band.windowToMinutes) return null
    return format(text.preview, {
      distance: `${kilometresOf(band.upToMeters)} km`,
      fee: band.feeCents === 0 ? text.free : money(band.feeCents),
      from: String(band.windowFromMinutes),
      to: String(band.windowToMinutes),
    })
  })
}

/** How far the bands as typed reach — the furthest row that reads — for the circle on the map. */
export function deliveryRadiusOf(value: DeliverySettingsFormValues): number | null {
  const reaches = value.bands.map((row) => metresFrom(row.upToKm)).filter((metres): metres is number => metres !== null)
  return reaches.length > 0 ? Math.max(...reaches) : null
}

export function deliveryCarriersOf(connection: MelhorEnvioConnection): DeliveryCarriersView {
  return { available: connection.available, status: connection.status, accountName: connection.account?.name ?? null, sandbox: connection.environment === "SANDBOX" }
}

/** "Rua Augusta, 1500 — Consolação, São Paulo/SP", or null while the shop has no street or city to collect at. */
export function pickupAddressOf(address: StoreAddress): string | null {
  if (!address.street || !address.city) return null
  const street = [address.street, address.number].filter(Boolean).join(", ")
  const place = [address.neighborhood, [address.city, address.state].filter(Boolean).join("/")].filter(Boolean).join(", ")
  return `${street} — ${place}`
}

/** The API's refusal of a save, in words. */
export function deliveryErrorOf(code: string, text: Text["errors"]): string {
  return code === "DELIVERY_SETTINGS_INVALID" ? text.DELIVERY_SETTINGS_INVALID : text.UNKNOWN
}
