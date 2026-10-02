// Types
import type { MelhorEnvioAccountOverview, MelhorEnvioConnection, MelhorEnvioSettings, MelhorEnvioSettingsPayload } from "@harness-monorepo/contracts"
import type { MelhorEnvioCardView, ShippingSettingsFormValues, ShippingSettingsIssues, WalletView } from "@harness-monorepo/ui/lib/integrations"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// App
import { millimetres, whole } from "@/components/catalog/product-form-mapping"
import { INTEGRATION_RESULT_KEYS } from "./integration-return"

const HANDLING_DAYS_MAX = 30
/** The carriers' own ceilings, as the product's form takes them (`PARCEL_GRAMS_MAX`, `PARCEL_MM_MAX`). */
const PACKAGE_GRAMS_MAX = 30_000
const PACKAGE_MM_MAX = 2_000

/** The card in words: the wallet read, being read, or not readable now — a failed read is never a zero. */
export function melhorEnvioCardOf(connection: MelhorEnvioConnection, account: { data?: MelhorEnvioAccountOverview; isPending: boolean; isError: boolean }, money: (cents: number) => string): MelhorEnvioCardView {
  const wallet: WalletView = account.data ? { state: "ready", balance: money(account.data.balanceCents) } : account.isError ? { state: "failed" } : { state: "loading" }
  return { available: connection.available, status: connection.status, sandbox: connection.environment === "SANDBOX", account: connection.account, wallet }
}

/**
 * The settings as the form starts from them. A shop that never chose offers every service, so the form
 * starts with all of them on — once their list is in hand; until then, with none to show.
 */
export function shippingFormOf(settings: MelhorEnvioSettings, serviceIds: readonly number[] | null): ShippingSettingsFormValues {
  const parcel = settings.defaultPackage
  const cm = (mm: number) => String(mm / 10).replace(".", ",")
  return {
    serviceIds: settings.serviceIds ?? [...(serviceIds ?? [])],
    handlingDays: String(settings.handlingDays),
    weight: parcel ? String(parcel.weightGrams) : "",
    length: parcel ? cm(parcel.lengthMm) : "",
    width: parcel ? cm(parcel.widthMm) : "",
    height: parcel ? cm(parcel.heightMm) : "",
  }
}

/** What the form holds as the API takes it, or why not — field by field, before anything is sent. */
export function shippingPayloadOf(value: ShippingSettingsFormValues, text: UiMessages["integrations"]["shipping"]["issues"]): { payload: MelhorEnvioSettingsPayload } | { issues: ShippingSettingsIssues } {
  const issues: ShippingSettingsIssues = {}
  const days = /^\d{1,2}$/.test(value.handlingDays.trim()) ? Number(value.handlingDays.trim()) : null
  if (days === null || days > HANDLING_DAYS_MAX) issues.handlingDays = text.handlingDays

  const typed = [value.weight, value.length, value.width, value.height].map((each) => each.trim())
  const none = typed.every((each) => each === "")
  const weightGrams = whole(value.weight)
  const [lengthMm, widthMm, heightMm] = [value.length, value.width, value.height].map(millimetres)
  const sizes = [lengthMm, widthMm, heightMm]
  if (!none) {
    if (weightGrams === null || weightGrams <= 0 || sizes.some((size) => size === null || size <= 0)) issues.package = text.package
    else if (weightGrams > PACKAGE_GRAMS_MAX || sizes.some((size) => (size ?? 0) > PACKAGE_MM_MAX)) issues.package = text.packageRange
  }

  if (issues.handlingDays || issues.package) return { issues }
  return {
    payload: {
      handlingDays: days ?? 0,
      serviceIds: [...value.serviceIds],
      defaultPackage: none ? null : { weightGrams: weightGrams!, lengthMm: lengthMm!, widthMm: widthMm!, heightMm: heightMm! },
    },
  }
}

/** What the way back from Melhor Envio carries in the address, in words; null on an ordinary visit. */
export function integrationResultOf(query: Record<string, string | string[] | undefined>, text: UiMessages["integrations"]["result"]): { tone: "done" | "failed"; message: string } | null {
  const one = (key: string) => (typeof query[key] === "string" ? query[key] : undefined)
  if (one(INTEGRATION_RESULT_KEYS.connected) === "melhor-envio") return { tone: "done", message: text.connected }
  const code = one(INTEGRATION_RESULT_KEYS.error)
  if (!code) return null
  return { tone: "failed", message: code in text.errors ? text.errors[code as keyof typeof text.errors] : text.errors.UNKNOWN }
}

/** The API's refusal of a save, in words. */
export function shippingErrorOf(code: string, text: UiMessages["integrations"]["shipping"]["errors"]): string {
  return code === "MELHOR_ENVIO_SETTINGS_INVALID" ? text.MELHOR_ENVIO_SETTINGS_INVALID : text.UNKNOWN
}
