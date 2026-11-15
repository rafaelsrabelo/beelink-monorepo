// Types
import type { AffiliatePageContent, AffiliatePageOverview, AffiliatePagePayload, AffiliatePageSettings, PublicCustomDomain, StorefrontRouteWords } from "@harness-monorepo/contracts"
import type { AffiliatePageCardValues, AffiliatePageContentValues, AffiliatePageIssues, AffiliatePagePairValue, AffiliatePagePreviewView } from "@harness-monorepo/ui/lib/affiliate-page"
import { AFFILIATE_PAGE_MAX } from "@harness-monorepo/ui/lib/affiliate-page"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"
import type { AffiliatePagePart } from "@harness-monorepo/ui/blocks/affiliates/affiliate-page-editor"

// UI
import { format } from "@harness-monorepo/ui/locales/index"

/*
  The crossing between the "Seja afiliado" page on the wire (plan 2026-11-14) and the panel's card and
  editor. The editor shows every text — the product's own where the shop wrote none — and a text
  saved as the product's own, or blank, travels as `null`: so a better default reaches every shop
  that never changed it.
*/

type Defaults = UiMessages["affiliateJoin"]["defaults"]
type Text = UiMessages["affiliatePage"]

const TEXT_KEYS = ["badge", "title", "subtitle", "ctaLabel", "stepsTitle", "questionsTitle", "closingTitle", "closingText", "formTitle", "formSubtitle", "extraQuestion", "successMessage", "bannerTitle", "bannerText", "bannerCta"] as const
type TextKey = (typeof TEXT_KEYS)[number]

const lengthOf = (text: string): number => [...text].length
const pairsOf = <T extends { title: string; text: string }>(items: readonly T[]): AffiliatePagePairValue[] => items.map(({ title, text }) => ({ title, text }))
const questionsOf = (items: readonly { question: string; answer: string }[]): AffiliatePagePairValue[] => items.map(({ question, answer }) => ({ title: question, text: answer }))
const samePairs = (a: readonly AffiliatePagePairValue[], b: readonly AffiliatePagePairValue[]): boolean => a.length === b.length && a.every((item, index) => item.title === b[index]?.title && item.text === b[index]?.text)
const trimmedPairs = (items: readonly AffiliatePagePairValue[]): AffiliatePagePairValue[] => items.map(({ title, text }) => ({ title: title.trim(), text: text.trim() }))

/** What a page with nothing of the shop's reads, in the editor's terms. */
function defaultValuesOf(defaults: Defaults): AffiliatePageContentValues {
  return {
    ...Object.fromEntries(TEXT_KEYS.map((key) => [key, defaults[key]])) as Record<TextKey, string>,
    highlights: [...defaults.highlights],
    imageUrl: null,
    steps: pairsOf(defaults.steps),
    benefits: pairsOf(defaults.benefits),
    questions: questionsOf(defaults.questions),
    askExtraQuestion: true,
  }
}

/** The page's texts as the editor shows them: the shop's, else the product's own. */
export function contentValuesOf(content: AffiliatePageContent, defaults: Defaults): AffiliatePageContentValues {
  const own = defaultValuesOf(defaults)
  return {
    ...(Object.fromEntries(TEXT_KEYS.map((key) => [key, content[key] ?? own[key]])) as Record<TextKey, string>),
    highlights: content.highlights ?? own.highlights,
    imageUrl: content.imageUrl,
    steps: content.steps ? pairsOf(content.steps) : own.steps,
    benefits: content.benefits ? pairsOf(content.benefits) : own.benefits,
    questions: content.questions ? questionsOf(content.questions) : own.questions,
    askExtraQuestion: content.askExtraQuestion,
  }
}

/** One part's texts, back to the product's own. */
export function restoredValuesOf(values: AffiliatePageContentValues, part: AffiliatePagePart, defaults: Defaults): AffiliatePageContentValues {
  const own = defaultValuesOf(defaults)
  const parts: Record<AffiliatePagePart, Partial<AffiliatePageContentValues>> = {
    top: { badge: own.badge, title: own.title, subtitle: own.subtitle, ctaLabel: own.ctaLabel, highlights: own.highlights, imageUrl: null },
    steps: { stepsTitle: own.stepsTitle, steps: own.steps },
    benefits: { benefits: own.benefits },
    questions: { questionsTitle: own.questionsTitle, questions: own.questions },
    closing: { closingTitle: own.closingTitle, closingText: own.closingText },
    form: { formTitle: own.formTitle, formSubtitle: own.formSubtitle, askExtraQuestion: true, extraQuestion: own.extraQuestion, successMessage: own.successMessage },
    banner: { bannerTitle: own.bannerTitle, bannerText: own.bannerText, bannerCta: own.bannerCta },
  }
  return { ...values, ...parts[part] }
}

/** What does not hold, by field — before anything is sent. A list's item needs both its texts. */
export function contentIssuesOf(values: AffiliatePageContentValues, text: Text["editor"]): AffiliatePageIssues {
  const issues: AffiliatePageIssues = {}
  const tooLong = (max: number) => format(text.tooLong, { max: String(max) })
  for (const key of TEXT_KEYS) if (lengthOf(values[key].trim()) > AFFILIATE_PAGE_MAX[key]) issues[key] = tooLong(AFFILIATE_PAGE_MAX[key])
  values.highlights.forEach((highlight, index) => {
    if (lengthOf(highlight.trim()) > AFFILIATE_PAGE_MAX.highlight) issues[`highlights.${index}`] = tooLong(AFFILIATE_PAGE_MAX.highlight)
  })
  const bounds = { steps: [AFFILIATE_PAGE_MAX.itemTitle, AFFILIATE_PAGE_MAX.itemText], benefits: [AFFILIATE_PAGE_MAX.itemTitle, AFFILIATE_PAGE_MAX.itemText], questions: [AFFILIATE_PAGE_MAX.question, AFFILIATE_PAGE_MAX.answer] } as const
  for (const list of ["steps", "benefits", "questions"] as const) {
    values[list].forEach((item, index) => {
      ;(["title", "text"] as const).forEach((side, at) => {
        const typed = item[side].trim()
        const max = bounds[list][at]!
        if (!typed) issues[`${list}.${index}.${side}`] = text.required
        else if (lengthOf(typed) > max) issues[`${list}.${index}.${side}`] = tooLong(max)
      })
    })
  }
  return issues
}

/** The texts to save: trimmed; blank, or the product's own, as `null`. */
export function contentOf(values: AffiliatePageContentValues, defaults: Defaults): AffiliatePageContent {
  const own = defaultValuesOf(defaults)
  const textOf = (key: TextKey): string | null => {
    const typed = values[key].trim()
    return typed && typed !== own[key] ? typed : null
  }
  const highlights = values.highlights.map((highlight) => highlight.trim()).filter(Boolean)
  const steps = trimmedPairs(values.steps)
  const benefits = trimmedPairs(values.benefits)
  const questions = trimmedPairs(values.questions)
  return {
    ...(Object.fromEntries(TEXT_KEYS.map((key) => [key, textOf(key)])) as Record<TextKey, string | null>),
    highlights: highlights.length === own.highlights.length && highlights.every((highlight, index) => highlight === own.highlights[index]) ? null : highlights,
    imageUrl: values.imageUrl,
    steps: samePairs(steps, own.steps) ? null : steps,
    benefits: samePairs(benefits, own.benefits) ? null : benefits,
    questions: samePairs(questions, own.questions) ? null : questions.map(({ title, text }) => ({ question: title, answer: text })),
    askExtraQuestion: values.askExtraQuestion,
  }
}

/** The marks filled in, as the shop window fills them. */
export function withMarks(text: string, marks: { store: string; rate: string }): string {
  return format(text, { loja: marks.store, comissao: marks.rate })
}

/** The top as a visitor will read it. */
export function previewOf(values: AffiliatePageContentValues, defaults: Defaults, marks: { store: string; rate: string }): AffiliatePagePreviewView {
  const shown = (key: "badge" | "title" | "subtitle" | "ctaLabel") => withMarks(values[key].trim() || defaults[key], marks)
  return {
    badge: shown("badge"),
    title: shown("title"),
    subtitle: shown("subtitle"),
    ctaLabel: shown("ctaLabel"),
    highlights: values.highlights.map((highlight) => highlight.trim()).filter(Boolean).map((highlight) => withMarks(highlight, marks)),
    imageUrl: values.imageUrl,
  }
}

/** The card as the page stands; the API's null table is the default one. */
export function cardValuesOf(page: AffiliatePageSettings, defaultTableId: string): AffiliatePageCardValues {
  const { homeBanner, footerLink, topStrip } = page.placements
  return { open: page.open, homeBanner, footerLink, topStrip, tableId: page.tableId ?? defaultTableId, approval: page.approval }
}

/** The whole page to save: the card as chosen, the texts as they stand. */
export function pagePayloadOf(card: AffiliatePageCardValues, content: AffiliatePageContent, defaultTableId: string): AffiliatePagePayload {
  const { open, homeBanner, footerLink, topStrip, tableId, approval } = card
  return { open, placements: { homeBanner, footerLink, topStrip }, tableId: tableId === defaultTableId ? null : tableId, approval, content }
}

/** Whether visitors see the page, said. */
export function pageStatusOf(overview: Pick<AffiliatePageOverview, "blockedBy">, text: Text["card"]): { live: boolean; message: string } {
  return overview.blockedBy ? { live: false, message: text.blocked[overview.blockedBy] } : { live: true, message: text.live }
}

/**
 * The page's address as a visitor types it, and as a link: at the shop's own domain once it is
 * active, else under the platform's host and the shop's slug — in the shop's own route word.
 */
export function pageAddressOf(store: { slug: string; routeWords: StorefrontRouteWords; customDomain: PublicCustomDomain | null }, origin: string): { address: string; href: string } {
  const word = store.routeWords.affiliateJoin
  if (store.customDomain?.status === "ACTIVE") return { address: `${store.customDomain.host}/${word}`, href: `https://${store.customDomain.host}/${word}` }
  const platform = new URL(origin)
  return { address: `${platform.host}/${store.slug}/${word}`, href: `${platform.origin}/${store.slug}/${word}` }
}

/** The API's refusal, in words; a code this screen does not know reads as the general failure. */
export function pageErrorOf(errorCode: string, errors: Text["errors"]): string {
  return errorCode in errors ? errors[errorCode as keyof Text["errors"]] : errors.UNKNOWN
}
