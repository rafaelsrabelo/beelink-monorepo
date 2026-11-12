// Types
import type { AffiliatePayoutPeriod, AffiliateProgram, AffiliateProgramPayload, CommissionTablePayload, CommissionTableSummary } from "@harness-monorepo/contracts"
import type { AffiliatePayoutRowView, AffiliateSettingsFormValues, AffiliateSettingsIssues, CommissionTableFormValues, CommissionTableIssues } from "@harness-monorepo/ui/lib/affiliates"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// UI
import { centsFromStrict } from "@harness-monorepo/ui/lib/money"

// App
import { percentFrom } from "@/lib/discount-form"

/**
 * The crossing between the affiliate forms (IMPULSEIA-102) — strings, in the shopkeeper's units — and
 * the wire: basis points and whole days. The rules are the API's own (IMPULSEIA-101); saying them here
 * first spares a round trip, and the API still has the last word.
 */

type Text = UiMessages["affiliates"]

const BPS_MAX = 10_000
const PAYOUT_DELAY_DAYS = { min: 0, max: 60 }
const TERMS_MAX = 10_000
const NAME_MAX = 60
const WHOLE = /^\d{1,3}$/
const DAY_MS = 86_400_000

function daysFrom(typed: string, range: { min: number; max: number }): number | null {
  const trimmed = typed.trim()
  const days = WHOLE.test(trimmed) ? Number(trimmed) : Number.NaN
  return days >= range.min && days <= range.max ? days : null
}

/** A length as the API's validator counts it: code points. */
const lengthOf = (text: string): number => [...text].length

/**
 * A commission typed as a person types it, read as basis points: "12,5" is 1250, and 0 holds — it
 * pays nothing. `null` is an empty field, which follows the table's rate; `undefined` does not hold.
 */
export function commissionRateOf(typed: string): number | null | undefined {
  if (typed.trim() === "") return null
  const bps = centsFromStrict(typed)
  return bps !== null && bps <= BPS_MAX ? bps : undefined
}

export function affiliateSettingsFormOf(program: AffiliateProgram): AffiliateSettingsFormValues {
  return {
    enabled: program.enabled,
    attributionDays: program.attributionDays,
    payoutDelayDays: String(program.payoutDelayDays),
    termsText: program.termsText ?? "",
  }
}

/** The rules as the API takes them, or what to correct, field by field. Blank terms are none. */
export function affiliateSettingsPayloadOf(value: AffiliateSettingsFormValues, text: Text["issues"]): { payload: AffiliateProgramPayload } | { issues: AffiliateSettingsIssues } {
  const payoutDelayDays = daysFrom(value.payoutDelayDays, PAYOUT_DELAY_DAYS)
  const terms = value.termsText.trim()
  const termsHold = lengthOf(terms) <= TERMS_MAX

  if (payoutDelayDays === null || !termsHold) {
    return {
      issues: {
        ...(payoutDelayDays === null ? { payoutDelayDays: text.payoutDelayDays } : {}),
        ...(termsHold ? {} : { termsText: text.termsText }),
      },
    }
  }
  // The stored days go back as they are: a visit counts only for its session, and nothing here edits them.
  return { payload: { enabled: value.enabled, attributionDays: value.attributionDays, payoutDelayDays, termsText: terms || null } }
}

/**
 * The month's calendar at the delay as typed. The periods are the API's — one copy of the rule —
 * and only the delay in the field is added to each one's last day, so the calendar follows the field
 * before it is saved. A delay that does not hold shows no rows.
 */
export function payoutCalendarOf(periods: readonly AffiliatePayoutPeriod[], typedDelay: string, formatDay: (day: string) => string): AffiliatePayoutRowView[] {
  const delay = daysFrom(typedDelay, PAYOUT_DELAY_DAYS)
  if (delay === null) return []
  return periods.map((period) => {
    const due = new Date(Date.parse(`${period.lastDay}T00:00:00Z`) + delay * DAY_MS).toISOString().slice(0, 10)
    return { from: formatDay(period.firstDay), to: formatDay(period.lastDay), due: formatDay(due) }
  })
}

/** A calendar day in words, as the shop reads it: "20 de nov.". */
export function payoutDayFormatter(locale: string): (day: string) => string {
  const format = new Intl.DateTimeFormat(locale, { day: "numeric", month: "short", timeZone: "UTC" })
  return (day) => format.format(new Date(`${day}T00:00:00Z`))
}

export const EMPTY_COMMISSION_TABLE: CommissionTableFormValues = { name: "", rate: "" }

export function commissionTableFormOf(table: Pick<CommissionTableSummary, "name" | "defaultRateBps">): CommissionTableFormValues {
  return { name: table.name, rate: percentFrom(table.defaultRateBps) }
}

export function commissionTablePayloadOf(value: CommissionTableFormValues, text: Text["issues"]): { payload: CommissionTablePayload } | { issues: CommissionTableIssues } {
  const name = value.name.trim()
  const nameHolds = name !== "" && lengthOf(name) <= NAME_MAX
  const rate = value.rate.trim() === "" ? undefined : commissionRateOf(value.rate)

  if (!nameHolds || rate === undefined || rate === null) {
    return { issues: { ...(nameHolds ? {} : { name: text.name }), ...(rate === undefined || rate === null ? { rate: text.rate } : {}) } }
  }
  return { payload: { name, defaultRateBps: rate } }
}

/** The API's refusal, in words; a code this screen does not know reads as the general failure. */
export function affiliateErrorOf(errorCode: string, text: Text["errors"]): string {
  return errorCode in text ? text[errorCode as keyof Text["errors"]] : text.UNKNOWN
}
