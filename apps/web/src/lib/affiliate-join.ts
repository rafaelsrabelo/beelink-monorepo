// Types
import type { AffiliateApplicationPayload, PublicAffiliatePage, PublicAffiliatePagePlacement, PublicStore } from "@harness-monorepo/contracts"
import type { AffiliateJoinBannerView, AffiliateJoinFormValues, AffiliateJoinFormView, AffiliateJoinIssues, AffiliateJoinPageView } from "@harness-monorepo/ui/lib/affiliate-join"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// UI
import { ratePercentOf } from "@harness-monorepo/ui/lib/cashback"
import { format } from "@harness-monorepo/ui/locales/index"

/*
  The shop's "Seja afiliado" page as the shop window draws it (plan 2026-11-14): each text the shop's,
  else the product's own, and `{loja}` and `{comissao}` filled in with the shop's name and the
  announced table's rate — "até" its highest when a product on sale earns more than its general one.
  The panel's preview fills them the same way.
*/

type Join = UiMessages["affiliateJoin"]

/** What the marks become at this shop. */
export interface JoinMarks {
  store: string
  /** "10%", or "até 30%". */
  rate: string
}

export function joinMarksOf(store: Pick<PublicStore, "name">, rates: Pick<PublicAffiliatePage, "rateBps" | "maxRateBps">, join: Pick<Join, "upToRate">, locale: string): JoinMarks {
  const rate = rates.maxRateBps > rates.rateBps ? format(join.upToRate, { rate: ratePercentOf(rates.maxRateBps, locale) }) : ratePercentOf(rates.rateBps, locale)
  return { store: store.name, rate }
}

const fill = (text: string, marks: JoinMarks): string => format(text, { loja: marks.store, comissao: marks.rate })

/**
 * Where the shop window leads to the page: nowhere on a page locked for want of payment, a site that
 * sells nothing, or under an affiliate's name — there the shop is the affiliate's window, and
 * recruiting would compete with whoever brought the visitor.
 */
export function recruitingOf(store: Pick<PublicStore, "affiliatePage" | "unavailable" | "type"> & { affiliate?: string | null }): PublicAffiliatePagePlacement | null {
  if (!store.affiliatePage || store.unavailable || store.type !== "ECOMMERCE" || store.affiliate) return null
  return store.affiliatePage
}

/** The page's body, in words. */
export function joinPageViewOf(page: PublicAffiliatePage, defaults: Join["defaults"], marks: JoinMarks): AffiliateJoinPageView {
  const { content } = page
  const text = (own: string | null, product: string) => fill(own ?? product, marks)
  return {
    badge: text(content.badge, defaults.badge),
    title: text(content.title, defaults.title),
    subtitle: text(content.subtitle, defaults.subtitle),
    ctaLabel: text(content.ctaLabel, defaults.ctaLabel),
    highlights: (content.highlights ?? defaults.highlights).map((highlight) => fill(highlight, marks)),
    imageUrl: content.imageUrl,
    stepsTitle: text(content.stepsTitle, defaults.stepsTitle),
    steps: (content.steps ?? defaults.steps).map((step) => ({ title: fill(step.title, marks), text: fill(step.text, marks) })),
    benefits: (content.benefits ?? defaults.benefits).map((benefit) => ({ title: fill(benefit.title, marks), text: fill(benefit.text, marks) })),
    questionsTitle: text(content.questionsTitle, defaults.questionsTitle),
    questions: (content.questions ?? defaults.questions).map((item) => ({ question: fill(item.question, marks), answer: fill(item.answer, marks) })),
    closingTitle: text(content.closingTitle, defaults.closingTitle),
    closingText: text(content.closingText, defaults.closingText),
  }
}

export function joinFormViewOf(page: PublicAffiliatePage, join: Join, marks: JoinMarks): AffiliateJoinFormView {
  const { content } = page
  return {
    title: fill(content.formTitle ?? join.defaults.formTitle, marks),
    subtitle: fill(content.formSubtitle ?? join.defaults.formSubtitle, marks),
    extraQuestion: content.askExtraQuestion ? fill(content.extraQuestion ?? join.defaults.extraQuestion, marks) : null,
    note: fill(join.form.note, marks),
  }
}

/** The message after sending, the shop's or the product's own. */
export function joinSuccessOf(page: PublicAffiliatePage, defaults: Join["defaults"], marks: JoinMarks): string {
  return fill(page.content.successMessage ?? defaults.successMessage, marks)
}

/** The home's banner — and the top strip, which says its title and its button. */
export function joinBannerOf(placement: PublicAffiliatePagePlacement, defaults: Join["defaults"], marks: JoinMarks): AffiliateJoinBannerView {
  return {
    title: fill(placement.bannerTitle ?? defaults.bannerTitle, marks),
    text: fill(placement.bannerText ?? defaults.bannerText, marks),
    cta: fill(placement.bannerCta ?? defaults.bannerCta, marks),
  }
}

/** The top strip that invites to the page: the banner's title and its button, leading there. */
export function joinStripOf(banner: AffiliateJoinBannerView, href: string): { left: string; right: string; background: null; href: string; external: false } {
  return { left: banner.title, right: banner.cta, background: null, href, external: false }
}

/** What R$ 200,00 of products earns at the announced rate, said: the page's example beside the link. */
export function joinExampleOf(rateBps: number, join: Join, locale: string): string | null {
  if (rateBps <= 0) return null
  const money = new Intl.NumberFormat(locale, { style: "currency", currency: "BRL" })
  const saleCents = 20_000
  return format(join.example, { sale: money.format(saleCents / 100), earning: money.format(Math.floor((saleCents * rateBps) / 10_000) / 100) })
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const NAME = { min: 2, max: 120 }

/** What the form sends, or what to correct: the API checks it again and has the last word. */
export function applicationPayloadOf(value: AffiliateJoinFormValues, asked: boolean, text: Join["form"]["issues"]): { payload: AffiliateApplicationPayload } | { issues: AffiliateJoinIssues } {
  const name = value.name.trim()
  const email = value.email.trim()
  const digits = value.phone.replace(/\D/g, "")
  const issues: AffiliateJoinIssues = {
    ...([...name].length < NAME.min || [...name].length > NAME.max ? { name: text.name } : {}),
    ...(EMAIL.test(email) ? {} : { email: text.email }),
    ...(digits.length >= 10 && digits.length <= 11 ? {} : { phone: text.phone }),
    ...(value.accepted ? {} : { accepted: text.accepted }),
  }
  if (Object.keys(issues).length > 0) return { issues }
  const answer = value.extraAnswer.trim()
  return { payload: { name, email, phone: value.phone, extraAnswer: asked && answer ? answer : null, accepted: true, ...(value.website ? { website: value.website } : {}) } }
}

/** The API's refusal, in words; a code this page does not know reads as the general failure. */
export function applicationErrorOf(errorCode: string, errors: Join["form"]["errors"]): string {
  return errorCode in errors ? errors[errorCode as keyof Join["form"]["errors"]] : errors.UNKNOWN
}
