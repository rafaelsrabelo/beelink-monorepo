// Types
import type { BuyOrderLabelPayload, LabelBalanceDetails, LabelRefusedDetails, OrderLabelOverview, OrderLabelVolume } from "@harness-monorepo/contracts"
import type { OrderLabelCardView, OrderLabelFormValues, OrderLabelIssues, OrderLabelNote } from "@harness-monorepo/ui/lib/label"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// UI
import { EMPTY_LABEL_FORM } from "@harness-monorepo/ui/lib/label"
import { format } from "@harness-monorepo/ui/locales/index"

// App
import { millimetres, whole } from "@/components/catalog/product-form-mapping"

type Text = UiMessages["orders"]["label"]

/** The carriers' own ceilings, as the product's form takes them (`PARCEL_GRAMS_MAX`, `PARCEL_MM_MAX`). */
const GRAMS_MAX = 30_000
const MM_MAX = 2_000

/** What the card says things with, beyond its words: money and dates in the reader's language, and where to fix what is missing. */
export interface LabelContext {
  money: (cents: number) => string
  date: (iso: string) => string
  integrationsHref: string
  storeHref: string
}

/** The label's state and what stands in the way of buying one, in words (BEELINK-187). */
export function labelCardViewOf(overview: OrderLabelOverview, text: Text, context: LabelContext): OrderLabelCardView {
  const label = overview.label
  const price = label ? context.money(label.priceCents) : ""
  const statusText = !label
    ? ""
    : label.status === "IN_CART"
      ? format(text.statusInCart, { price })
      : label.status === "PAID"
        ? format(text.statusPaid, { price })
        : label.status === "GENERATED"
          ? format(text.statusGenerated, { price })
          : format(text.statusCancelled, { date: label.cancelledAt ? context.date(label.cancelledAt) : "" })

  const blockers = overview.blockers.map((blocker): OrderLabelNote => {
    const words = text.blockers[blocker]
    if (blocker === "NOT_CONNECTED" || blocker === "NO_SENDER_DOCUMENT") return { text: words, href: context.integrationsHref, linkLabel: text.openIntegrations }
    if (blocker === "NO_ORIGIN") return { text: words, href: context.storeHref, linkLabel: text.openStore }
    return { text: words }
  })

  return {
    carrier: overview.carrier ? `${overview.carrier.company} · ${overview.carrier.service}` : "",
    blockers,
    balance: overview.balanceCents === null ? null : context.money(overview.balanceCents),
    label: label ? { status: label.status, statusText, protocol: label.protocol, trackingCode: label.trackingCode } : null,
  }
}

const centimetres = (mm: number) => String(mm / 10).replace(".", ",")

/** The form as it starts: the box of a label still in the cart, else the one Melhor Envio worked out. */
export function labelFormOf(overview: OrderLabelOverview): OrderLabelFormValues {
  const kept = overview.label && overview.label.status !== "CANCELLED" ? overview.label : null
  const box: OrderLabelVolume | null = kept?.volume ?? overview.suggestedVolume
  if (!box) return { ...EMPTY_LABEL_FORM, invoiceKey: kept?.invoiceKey ?? "" }
  return { weight: String(box.weightGrams), length: centimetres(box.lengthMm), width: centimetres(box.widthMm), height: centimetres(box.heightMm), invoiceKey: kept?.invoiceKey ?? "" }
}

/** The form as the API takes it — grams, millimetres, the key's 44 digits — or what to correct, field by field. */
export function labelPayloadOf(value: OrderLabelFormValues, text: Text["issues"]): { payload: BuyOrderLabelPayload } | { issues: OrderLabelIssues } {
  const weightGrams = whole(value.weight)
  const [lengthMm, widthMm, heightMm] = [value.length, value.width, value.height].map(millimetres)
  const sizes = [lengthMm, widthMm, heightMm]
  const boxHolds = weightGrams !== null && weightGrams > 0 && weightGrams <= GRAMS_MAX && sizes.every((size) => size !== null && size > 0 && size <= MM_MAX)
  const key = value.invoiceKey.replace(/\D/g, "")
  const keyHolds = key === "" || key.length === 44

  const issues: OrderLabelIssues = { ...(boxHolds ? {} : { volume: text.volume }), ...(keyHolds && !(value.invoiceKey.trim() && !key) ? {} : { invoiceKey: text.invoiceKey }) }
  if (issues.volume || issues.invoiceKey) return { issues }
  return { payload: { volume: { weightGrams: weightGrams!, lengthMm: lengthMm!, widthMm: widthMm!, heightMm: heightMm! }, invoiceKey: key || null } }
}

/** Why a step did not go through, in words, with the way to act on it: the wallet's for a short one. */
export function labelErrorOf(errorCode: string, details: unknown, text: Text, money: (cents: number) => string): OrderLabelNote {
  const errors = text.errors
  if (errorCode === "LABEL_BALANCE_INSUFFICIENT" && details && typeof details === "object") {
    const short = details as Partial<LabelBalanceDetails>
    if (typeof short.balanceCents === "number" && typeof short.priceCents === "number") {
      return {
        text: format(errors.LABEL_BALANCE_INSUFFICIENT, { balance: money(short.balanceCents), price: money(short.priceCents) }),
        ...(typeof short.walletUrl === "string" ? { href: short.walletUrl, linkLabel: text.openWallet, external: true } : {}),
      }
    }
  }
  if (errorCode === "LABEL_REFUSED") {
    const reason = details && typeof details === "object" ? (details as Partial<LabelRefusedDetails>).reason : undefined
    return { text: format(errors.LABEL_REFUSED, { reason: typeof reason === "string" ? reason : "" }).trim() }
  }
  if (errorCode === "INTEGRATION_NEEDS_RECONNECT") return { text: errors.INTEGRATION_NOT_CONNECTED }
  const known = ["LABEL_NOT_CANCELLABLE", "LABEL_NOT_AVAILABLE", "LABEL_INVALID", "LABEL_NOT_GENERATED", "INTEGRATION_NOT_CONNECTED", "INTEGRATION_UNREACHABLE"] as const
  const code = known.find((each) => each === errorCode)
  return { text: code ? errors[code] : errors.UNKNOWN }
}
