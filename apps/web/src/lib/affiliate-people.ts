// Types
import type { CommissionTableSummary, ShopAffiliate, ShopAffiliateSummary, UpdateAffiliatePayload } from "@harness-monorepo/contracts"
import type { AffiliateListItemView, AffiliateRecordFormValues, AffiliateRecordIssues, AffiliateRecordView, AffiliateTableOption } from "@harness-monorepo/ui/lib/affiliates"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// UI
import { ratePercentOf } from "@harness-monorepo/ui/lib/cashback"
import { isCpf, maskCpf } from "@harness-monorepo/ui/lib/cpf"
import { format } from "@harness-monorepo/ui/locales/index"

// App
import { phoneLineOf } from "@/lib/account-menu"
import { cpfLineOf } from "@/lib/customer-identity"

/**
 * The crossing between the shop's affiliates on the wire (IMPULSEIA-103) and the panel's blocks
 * (IMPULSEIA-104): lines in words, forms as typed. The rules are the API's; saying them here first
 * spares a round trip, and the API still has the last word.
 */

type Text = UiMessages["affiliates"]

const NOTE_MAX = 500
/** The API keeps a phone as 12 to 15 digits with the country code; a Brazilian one is typed with 10 or 11. */
const PHONE_DIGITS = { min: 10, max: 15 }

const lengthOf = (text: string): number => [...text].length
const digitsOf = (text: string): string => text.replace(/\D/g, "")
const isPhone = (typed: string): boolean => digitsOf(typed).length >= PHONE_DIGITS.min && digitsOf(typed).length <= PHONE_DIGITS.max

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

/**
 * The tables an affiliate can be put on, the default first, as the programme lists them: the shared
 * ones, and their own commission when they have one (12/11/2026) — another's own is nobody else's.
 */
export function affiliateTableOptionsOf(tables: readonly CommissionTableSummary[], locale: string, own?: { tableId: string; label: string }): AffiliateTableOption[] {
  return tables
    .filter((table) => table.affiliate === null || table.id === own?.tableId)
    .map((table) => ({ id: table.id, name: table.id === own?.tableId ? own.label : table.name, rate: ratePercentOf(table.defaultRateBps, locale) }))
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
    cpf: cpfLineOf(affiliate.cpf),
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

export function recordFormOf(affiliate: Pick<ShopAffiliate, "table" | "phone" | "cpf" | "note">): AffiliateRecordFormValues {
  return { tableId: affiliate.table.id, phone: phoneLineOf(affiliate.phone) ?? "", cpf: affiliate.cpf ? maskCpf(affiliate.cpf) : "", note: affiliate.note ?? "" }
}

/** Invited before the phone and the CPF were asked (the user's review, 12/11/2026): the record asks to complete them. */
export function identityMissingOf(affiliate: Pick<ShopAffiliate, "phone" | "cpf">): boolean {
  return affiliate.phone === null || affiliate.cpf === null
}

/**
 * Only what changed, as the API's patch takes it — a key left out is left alone — or what to correct.
 * `pristine` when nothing differs from what is saved.
 */
export function recordPatchOf(value: AffiliateRecordFormValues, saved: AffiliateRecordFormValues, text: Text["affiliateIssues"]): { payload: UpdateAffiliatePayload } | { issues: AffiliateRecordIssues } | { pristine: true } {
  const note = value.note.trim()
  const phone = value.phone.trim()
  const phoneChanged = digitsOf(phone) !== digitsOf(saved.phone)
  const cpfChanged = digitsOf(value.cpf) !== digitsOf(saved.cpf)
  // Left blank as it was saved — one invited before — is no change; blanked or mistyped is a correction to make.
  const issues: AffiliateRecordIssues = {
    ...(lengthOf(note) > NOTE_MAX ? { note: text.note } : {}),
    ...(value.tableId ? {} : { tableId: text.table }),
    ...(phoneChanged && !isPhone(phone) ? { phone: text.phone } : {}),
    ...(cpfChanged && !isCpf(value.cpf) ? { cpf: text.cpf } : {}),
  }
  if (Object.keys(issues).length > 0) return { issues }
  const payload: UpdateAffiliatePayload = {
    ...(value.tableId !== saved.tableId ? { tableId: value.tableId } : {}),
    ...(phoneChanged ? { phone } : {}),
    ...(cpfChanged ? { cpf: digitsOf(value.cpf) } : {}),
    ...(note !== saved.note.trim() ? { note: note || null } : {}),
  }
  return Object.keys(payload).length > 0 ? { payload } : { pristine: true }
}
