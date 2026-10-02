// Types
import type { CashbackAdjustmentPayload, CashbackSettings, CashbackSettingsPayload } from "@harness-monorepo/contracts"
import type { CashbackAdjustmentFormValues, CashbackAdjustmentIssues, CashbackSettingsFormValues, CashbackSettingsIssues } from "@harness-monorepo/ui/lib/cashback"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// UI
import { centsFromStrict, reaisFrom } from "@harness-monorepo/ui/lib/money"
import { format } from "@harness-monorepo/ui/locales/index"

// App
import { percentFrom } from "@/lib/discount-form"

/**
 * The crossing between the cashback forms (BEELINK-242) — strings, in the shopkeeper's units — and
 * the wire: basis points, whole cents and days. The rules are the API's own (BEELINK-238); saying
 * them here first spares a round trip, and the API still has the last word.
 */

type Text = UiMessages["cashback"]

const BPS_MAX = 10_000
const AMOUNT_MAX_CENTS = 100_000_000
const DAYS_MAX = 3650
const WHOLE = /^\d{1,4}$/
const REASON_MIN = 3
const REASON_MAX = 200
/** The order the example is worked on: R$ 100,00, a round sum anyone multiplies in their head — or the minimum, when that is more. */
const EXAMPLE_ORDER_CENTS = 10_000

/** A percentage typed as a person types it, read as basis points: "2,5" is 250. The strict parser refuses what it would have to guess. */
function bpsFrom(typed: string): number | null {
  const bps = centsFromStrict(typed)
  return bps !== null && bps >= 1 && bps <= BPS_MAX ? bps : null
}

function daysFrom(typed: string): number | null {
  const trimmed = typed.trim()
  const days = WHOLE.test(trimmed) ? Number(trimmed) : 0
  return days >= 1 && days <= DAYS_MAX ? days : null
}

export function cashbackFormOf(settings: CashbackSettings): CashbackSettingsFormValues {
  return {
    enabled: settings.enabled,
    rate: percentFrom(settings.rateBps),
    validity: settings.expiresAfterDays === null ? "NONE" : "DAYS",
    validityDays: settings.expiresAfterDays === null ? "" : String(settings.expiresAfterDays),
    minimum: reaisFrom(settings.minSubtotalCents),
    maxRedeem: percentFrom(settings.maxRedeemBps),
  }
}

/** The rules as the API takes them, or what to correct, field by field. A blank minimum is none. */
export function cashbackPayloadOf(value: CashbackSettingsFormValues, text: Text["issues"]): { payload: CashbackSettingsPayload } | { issues: CashbackSettingsIssues } {
  const rateBps = bpsFrom(value.rate)
  const maxRedeemBps = bpsFrom(value.maxRedeem)
  const days = value.validity === "DAYS" ? daysFrom(value.validityDays) : null
  const minimum = value.minimum.trim() === "" ? 0 : centsFromStrict(value.minimum)
  const minimumHolds = minimum !== null && minimum >= 0 && minimum <= AMOUNT_MAX_CENTS

  const issues: CashbackSettingsIssues = {
    ...(rateBps === null ? { rate: text.rate } : {}),
    ...(value.validity === "DAYS" && days === null ? { validityDays: text.validityDays } : {}),
    ...(minimumHolds ? {} : { minimum: text.minimum }),
    ...(maxRedeemBps === null ? { maxRedeem: text.maxRedeem } : {}),
  }
  if (Object.keys(issues).length > 0 || rateBps === null || maxRedeemBps === null || !minimumHolds) return { issues }

  return { payload: { enabled: value.enabled, rateBps, expiresAfterDays: days, minSubtotalCents: minimum, maxRedeemBps } }
}

/**
 * What the rules as typed give on an order, in words — worked out as the API works it, rounded down to
 * the cent. The order is R$ 100,00, or the minimum when that is more: an example under the minimum
 * would promise what the API pays nothing on. A rate that does not hold yet asks for one rather than
 * show a wrong sum.
 */
export function cashbackExampleOf(value: CashbackSettingsFormValues, money: (cents: number) => string, text: Text["settings"]): string {
  if (!value.enabled) return text.exampleOff
  const rateBps = bpsFrom(value.rate)
  if (rateBps === null) return text.exampleRateMissing
  const minimum = value.minimum.trim() === "" ? 0 : centsFromStrict(value.minimum)
  const orderCents = minimum !== null && minimum > EXAMPLE_ORDER_CENTS && minimum <= AMOUNT_MAX_CENTS ? minimum : EXAMPLE_ORDER_CENTS
  const earned = Math.floor((orderCents * rateBps) / BPS_MAX)
  const days = value.validity === "DAYS" ? daysFrom(value.validityDays) : null
  return `${format(text.example, { order: money(orderCents), earned: money(earned) })}${days === null ? "" : format(text.exampleValidity, { days: String(days) })}.`
}

/**
 * A reason's length as the API counts it (class-validator's `isLength`): code points, less the
 * variation selectors that only pick how a character is drawn — "❤️" is one. Counted any other way, a
 * reason the form lets through comes back refused with no field to point at.
 */
function reasonLengthOf(reason: string): number {
  return [...reason].filter((char) => char !== "\uFE0F" && char !== "\uFE0E").length
}

export const EMPTY_ADJUSTMENT: CashbackAdjustmentFormValues = { direction: "GIVE", amount: "", reason: "" }

/** The adjustment as the API takes it — taking is a negative amount — or what to correct. */
export function adjustmentPayloadOf(value: CashbackAdjustmentFormValues, text: Text["issues"]): { payload: CashbackAdjustmentPayload } | { issues: CashbackAdjustmentIssues } {
  const cents = centsFromStrict(value.amount)
  const amountHolds = cents !== null && cents >= 1 && cents <= AMOUNT_MAX_CENTS
  const reason = value.reason.trim()
  // The API's maximum counts code points; its minimum, `reasonLengthOf`. Both hold or it asks again.
  const reasonHolds = reasonLengthOf(reason) >= REASON_MIN && [...reason].length <= REASON_MAX

  if (!amountHolds || !reasonHolds) return { issues: { ...(amountHolds ? {} : { amount: text.amount }), ...(reasonHolds ? {} : { reason: text.reason }) } }
  return { payload: { amountCents: value.direction === "TAKE" ? -cents : cents, reason } }
}

/** The API's refusal, in words; a code this screen does not know reads as the general failure. */
export function cashbackErrorOf(errorCode: string, text: Text["errors"]): string {
  return errorCode in text ? text[errorCode as keyof Text["errors"]] : text.UNKNOWN
}
