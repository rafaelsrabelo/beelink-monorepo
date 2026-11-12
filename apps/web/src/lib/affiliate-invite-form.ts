// Types
import type { AffiliateAcceptancePayload, AffiliateInvitation, AffiliateSignUpPayload, AffiliateSlugAvailability } from "@harness-monorepo/contracts"
import type { AffiliateAcceptanceFormValues, AffiliateAcceptanceIssues, AffiliateInvitationView, AffiliateSlugHint } from "@harness-monorepo/ui/lib/affiliates"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// UI
import { ratePercentOf } from "@harness-monorepo/ui/lib/cashback"

/**
 * The crossing between the invite on the wire (IMPULSEIA-103) and the page the person invited reads
 * (IMPULSEIA-104). The `/name` is the API's to normalise and judge, on the check and on the accept
 * alike; this says only what is plainly missing.
 */

type Text = UiMessages["affiliateInvite"]

const NAME = { min: 2, max: 120 }
const PASSWORD = { min: 8, max: 128 }
const PIX_KEY_MAX = 140

const lengthOf = (text: string): number => [...text].length

export function invitationViewOf(invitation: AffiliateInvitation, locale: string, date: (iso: string) => string): AffiliateInvitationView {
  return {
    storeName: invitation.store.name,
    storeLogoUrl: invitation.store.logoUrl,
    email: invitation.affiliate.email,
    generalRate: ratePercentOf(invitation.table.defaultRateBps, locale),
    categories: invitation.table.categories.map((category) => ({ name: category.name, rate: ratePercentOf(category.rateBps, locale) })),
    products: invitation.table.products.map((product) => ({ name: product.name, rate: ratePercentOf(product.rateBps, locale) })),
    termsText: invitation.terms.text,
    expires: date(invitation.expiresAt),
  }
}

/** Where the form starts: the `/name` the API suggests, and the name the shop invited. */
export function acceptanceFormOf(invitation: AffiliateInvitation): AffiliateAcceptanceFormValues {
  return { slug: invitation.suggestedSlug ?? "", pixKey: "", name: invitation.affiliate.name, password: "", agreed: false }
}

/** What accepting sends — with the account's name and password when it is made here — or what to correct. */
export function acceptancePayloadOf(
  value: AffiliateAcceptanceFormValues,
  input: { signUp: boolean; termsVersion: number },
  text: Text["issues"],
): { payload: AffiliateAcceptancePayload | AffiliateSignUpPayload } | { issues: AffiliateAcceptanceIssues } {
  const slug = value.slug.trim()
  const pixKey = value.pixKey.trim()
  const name = value.name.trim()
  const issues: AffiliateAcceptanceIssues = {
    ...(input.signUp && (lengthOf(name) < NAME.min || lengthOf(name) > NAME.max) ? { name: text.name } : {}),
    ...(input.signUp && (value.password.length < PASSWORD.min || value.password.length > PASSWORD.max) ? { password: text.password } : {}),
    ...(slug ? {} : { slug: text.slug }),
    ...(lengthOf(pixKey) > PIX_KEY_MAX ? { pixKey: text.pixKey } : {}),
    ...(value.agreed ? {} : { agreed: text.terms }),
  }
  if (Object.keys(issues).length > 0) return { issues }
  const acceptance: AffiliateAcceptancePayload = { slug, pixKey: pixKey || null, termsVersion: input.termsVersion }
  return { payload: input.signUp ? { ...acceptance, name, password: value.password } : acceptance }
}

/**
 * What the `/name` field says under it: checking while the typing has not settled or the answer is on
 * its way, then whether it serves — with the link it makes, `host/<shop>/<name>` — or why not.
 */
export function slugHintOf(input: { typed: string; settled: string; check: AffiliateSlugAvailability | undefined; checking: boolean; host: string; storeSlug: string }, text: Text): AffiliateSlugHint {
  const typed = input.typed.trim()
  if (!typed) return { kind: "idle" }
  if (typed !== input.settled.trim() || input.checking || !input.check) return { kind: "checking" }
  return input.check.available ? { kind: "available", link: `${input.host}/${input.storeSlug}/${input.check.slug}` } : { kind: "unavailable", message: text.slugReasons[input.check.reason ?? "INVALID"] }
}

/** The API's refusal, in words; a code this page does not know reads as the general failure. */
export function inviteErrorOf(errorCode: string, text: Text["errors"]): string {
  return errorCode in text ? text[errorCode as keyof Text["errors"]] : text.UNKNOWN
}
