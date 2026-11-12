// Types
import type { CommissionTableSummary, CreateAffiliatePayload, ShopAffiliate, ShopAffiliateSummary, UpdateAffiliatePayload } from "@harness-monorepo/contracts"
import type { AffiliateInviteFormValues, AffiliateInviteIssues, AffiliateListItemView, AffiliateRecordFormValues, AffiliateRecordIssues, AffiliateRecordView, AffiliateTableOption } from "@harness-monorepo/ui/lib/affiliates"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// UI
import { ratePercentOf } from "@harness-monorepo/ui/lib/cashback"
import { format } from "@harness-monorepo/ui/locales/index"

// App
import { phoneLineOf } from "@/lib/account-menu"

/**
 * The crossing between the shop's affiliates on the wire (IMPULSEIA-103) and the panel's blocks
 * (IMPULSEIA-104): lines in words, forms as typed. The rules are the API's; saying them here first
 * spares a round trip, and the API still has the last word.
 */

type Text = UiMessages["affiliates"]

const NAME = { min: 2, max: 120 }
const NOTE_MAX = 500
/** The API keeps a phone as 12 to 15 digits with the country code; a Brazilian one is typed with 10 or 11. */
const PHONE_DIGITS = { min: 10, max: 15 }
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const lengthOf = (text: string): number => [...text].length

/** An instant as the shop reads a date: Brasília's day. */
export function affiliateDateFormatter(locale: string): (iso: string) => string {
  const day = new Intl.DateTimeFormat(locale, { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "America/Sao_Paulo" })
  return (iso) => day.format(new Date(iso))
}

export function affiliateListItemOf(affiliate: ShopAffiliateSummary, text: Text["list"], date: (iso: string) => string): AffiliateListItemView {
  return {
    id: affiliate.id,
    name: affiliate.name,
    email: affiliate.email,
    status: affiliate.status,
    tableName: affiliate.table.name,
    since: affiliate.acceptedAt ? format(text.acceptedOn, { date: date(affiliate.acceptedAt) }) : format(text.invitedOn, { date: date(affiliate.invitedAt) }),
  }
}

/** The tables an affiliate can be put on, the default first, as the programme lists them. */
export function affiliateTableOptionsOf(tables: readonly CommissionTableSummary[], locale: string): AffiliateTableOption[] {
  return tables.map((table) => ({ id: table.id, name: table.name, rate: ratePercentOf(table.defaultRateBps, locale) }))
}

export function emptyInviteOf(defaultTableId: string): AffiliateInviteFormValues {
  return { name: "", email: "", tableId: defaultTableId, phone: "", note: "" }
}

/** The invite as the API takes it, or what to correct, field by field. Blank phone and note are none. */
export function invitePayloadOf(value: AffiliateInviteFormValues, text: Text["affiliateIssues"]): { payload: CreateAffiliatePayload } | { issues: AffiliateInviteIssues } {
  const name = value.name.trim()
  const email = value.email.trim().toLowerCase()
  const phone = value.phone.trim()
  const digits = phone.replace(/\D/g, "").length
  const note = value.note.trim()
  const issues: AffiliateInviteIssues = {
    ...(lengthOf(name) < NAME.min || lengthOf(name) > NAME.max ? { name: text.name } : {}),
    ...(EMAIL.test(email) ? {} : { email: text.email }),
    ...(value.tableId ? {} : { tableId: text.table }),
    ...(phone && (digits < PHONE_DIGITS.min || digits > PHONE_DIGITS.max) ? { phone: text.phone } : {}),
    ...(lengthOf(note) > NOTE_MAX ? { note: text.note } : {}),
  }
  if (Object.keys(issues).length > 0) return { issues }
  return { payload: { name, email, tableId: value.tableId, phone: phone || null, note: note || null } }
}

/** The affiliate's own address in the shop window: `<origin>/<shop>/<name>`, once they chose the name. */
export function affiliateLinkOf(origin: string, storeSlug: string, slug: string | null): string | null {
  return slug ? `${origin}/${storeSlug}/${slug}` : null
}

export function affiliateRecordViewOf(affiliate: ShopAffiliate, input: { text: Text["record"]; date: (iso: string) => string; link: string | null }): AffiliateRecordView {
  const { text, date } = input
  return {
    name: affiliate.name,
    email: affiliate.email,
    phone: phoneLineOf(affiliate.phone),
    status: affiliate.status,
    link: input.link,
    pixKey: affiliate.pixKey,
    terms: affiliate.termsVersion !== null && affiliate.termsAcceptedAt ? format(text.termsAccepted, { version: String(affiliate.termsVersion), date: date(affiliate.termsAcceptedAt) }) : null,
    history: [
      format(text.invitedOn, { date: date(affiliate.invitedAt) }),
      ...(affiliate.acceptedAt ? [format(text.acceptedOn, { date: date(affiliate.acceptedAt) })] : []),
      ...(affiliate.endedAt ? [format(text.endedOn, { date: date(affiliate.endedAt) })] : []),
    ],
    invite: affiliate.invite ? format(text.inviteOpen, { sent: date(affiliate.invite.sentAt), expires: date(affiliate.invite.expiresAt) }) : null,
  }
}

export function recordFormOf(affiliate: Pick<ShopAffiliate, "table" | "note">): AffiliateRecordFormValues {
  return { tableId: affiliate.table.id, note: affiliate.note ?? "" }
}

/**
 * Only what changed, as the API's patch takes it — a key left out is left alone — or what to correct.
 * `pristine` when nothing differs from what is saved.
 */
export function recordPatchOf(value: AffiliateRecordFormValues, saved: AffiliateRecordFormValues, text: Text["affiliateIssues"]): { payload: UpdateAffiliatePayload } | { issues: AffiliateRecordIssues } | { pristine: true } {
  const note = value.note.trim()
  if (lengthOf(note) > NOTE_MAX) return { issues: { note: text.note } }
  if (!value.tableId) return { issues: { tableId: text.table } }
  const payload: UpdateAffiliatePayload = {
    ...(value.tableId !== saved.tableId ? { tableId: value.tableId } : {}),
    ...(note !== saved.note.trim() ? { note: note || null } : {}),
  }
  return Object.keys(payload).length > 0 ? { payload } : { pristine: true }
}
