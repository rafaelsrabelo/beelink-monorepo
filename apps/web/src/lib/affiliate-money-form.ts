// Types
import type { AffiliateAdjustmentPayload, AffiliatePayoutPayload, OrderAffiliatePayload } from "@harness-monorepo/contracts"
import type {
  AffiliateAdjustmentFormValues,
  AffiliateAdjustmentIssues,
  AffiliatePayoutFormValues,
  AffiliatePayoutIssues,
  OrderAffiliateFormValues,
  OrderAffiliateIssues,
} from "@harness-monorepo/ui/lib/affiliate-money"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// UI
import { centsFromStrict, reaisFrom } from "@harness-monorepo/ui/lib/money"

type Issues = UiMessages["affiliates"]["moneyIssues"]

/** The API's bounds (apps/api `affiliates.constants.ts`): a reason or a note of 3 or 0 to 200 characters, an amount up to R$ 1.000.000,00. */
const REASON_MIN = 3
const TEXT_MAX = 200
const AMOUNT_MAX_CENTS = 100_000_000

/** Characters as the API counts them: a code point each, so an emoji is one. */
const lengthOf = (text: string): number => [...text].length

const reasonIssueOf = (reason: string, text: Issues): string | undefined => {
  const trimmed = reason.trim()
  return lengthOf(trimmed) < REASON_MIN || lengthOf(trimmed) > TEXT_MAX ? text.reason : undefined
}

/** A positive amount in reais, read only where it has one reading; null otherwise. */
const amountOf = (typed: string): number | null => {
  const cents = centsFromStrict(typed)
  return cents !== null && cents > 0 && cents <= AMOUNT_MAX_CENTS ? cents : null
}

export function orderAffiliatePayloadOf(value: OrderAffiliateFormValues, text: Issues): { payload: OrderAffiliatePayload } | { issues: OrderAffiliateIssues } {
  const reason = reasonIssueOf(value.reason, text)
  if (reason) return { issues: { reason } }
  return { payload: { affiliateId: value.affiliateId || null, reason: value.reason.trim() } }
}

export const EMPTY_ADJUSTMENT: AffiliateAdjustmentFormValues = { direction: "credit", amount: "", reason: "" }

export function adjustmentPayloadOf(value: AffiliateAdjustmentFormValues, text: Issues): { payload: AffiliateAdjustmentPayload } | { issues: AffiliateAdjustmentIssues } {
  const cents = amountOf(value.amount)
  const issues: AffiliateAdjustmentIssues = { ...(cents === null ? { amount: text.amount } : {}), ...(reasonIssueOf(value.reason, text) ? { reason: text.reason } : {}) }
  if (cents === null || issues.reason) return { issues }
  return { payload: { amountCents: value.direction === "debit" ? -cents : cents, reason: value.reason.trim() } }
}

/** A payout starts at what is available, paid today by Pix: the commonest case, changed in a keystroke. */
export function emptyPayoutOf(availableCents: number, today: string): AffiliatePayoutFormValues {
  return { amount: availableCents > 0 ? reaisFrom(availableCents) : "", paidOn: today, method: "PIX", note: "" }
}

export function payoutPayloadOf(value: AffiliatePayoutFormValues, today: string, text: Issues): { payload: AffiliatePayoutPayload } | { issues: AffiliatePayoutIssues } {
  const cents = amountOf(value.amount)
  const note = value.note.trim()
  // `YYYY-MM-DD` compares as the day it names; the date field gives nothing else.
  const dayIssue = !/^\d{4}-\d{2}-\d{2}$/.test(value.paidOn) || value.paidOn > today
  const issues: AffiliatePayoutIssues = {
    ...(cents === null ? { amount: text.amount } : {}),
    ...(dayIssue ? { paidOn: text.paidOn } : {}),
    ...(lengthOf(note) > TEXT_MAX ? { note: text.note } : {}),
  }
  if (cents === null || Object.keys(issues).length) return { issues }
  return { payload: { amountCents: cents, paidOn: value.paidOn, method: value.method, note: note || null } }
}

/** Today on the shop's calendar, `YYYY-MM-DD`: a payout is not dated after it. */
export function shopTodayOf(now: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" }).format(now)
}
