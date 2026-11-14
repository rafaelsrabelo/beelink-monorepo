// Types
import type { AffiliatePageBenefit, AffiliatePageContent, AffiliatePageQuestion, AffiliatePageStep } from '@harness-monorepo/contracts';

// App
import { EMPTY_AFFILIATE_PAGE_CONTENT } from './affiliate-page.constants.js';

type JsonRecord = { [key: string]: unknown };

const isRecord = (value: unknown): value is JsonRecord => typeof value === 'object' && value !== null && !Array.isArray(value);
const textOf = (value: unknown): string | null => (typeof value === 'string' && value !== '' ? value : null);

/** A list kept as written, or `null` — the product's own — when it is no list. Items that are not what the list holds are left out. */
function listOf<T>(value: unknown, item: (raw: unknown) => T | null): T[] | null {
  if (!Array.isArray(value)) return null;
  return value.flatMap((raw) => {
    const read = item(raw);
    return read === null ? [] : [read];
  });
}

const pairOf =
  <K extends string, V extends string>(first: K, second: V) =>
  (raw: unknown): ({ [key in K | V]: string }) | null => {
    if (!isRecord(raw)) return null;
    const a = textOf(raw[first]);
    const b = textOf(raw[second]);
    return a && b ? ({ [first]: a, [second]: b } as { [key in K | V]: string }) : null;
  };

const stepOf: (raw: unknown) => AffiliatePageStep | null = pairOf('title', 'text');
const benefitOf: (raw: unknown) => AffiliatePageBenefit | null = pairOf('title', 'text');
const questionOf: (raw: unknown) => AffiliatePageQuestion | null = pairOf('question', 'answer');

/**
 * What a page's `content` column holds, as the contract reads it. The DTO checked it on the way in;
 * this reads it back without trusting that every key is there — a row written before a field existed
 * lacks it, and a missing text is the product's own. A list of steps left empty is the product's own
 * too: a page explains how it works, or it is no page.
 */
export function affiliatePageContentOf(json: unknown): AffiliatePageContent {
  if (!isRecord(json)) return { ...EMPTY_AFFILIATE_PAGE_CONTENT };
  const steps = listOf(json.steps, stepOf);
  return {
    badge: textOf(json.badge),
    title: textOf(json.title),
    subtitle: textOf(json.subtitle),
    ctaLabel: textOf(json.ctaLabel),
    highlights: listOf(json.highlights, textOf),
    imageUrl: textOf(json.imageUrl),
    stepsTitle: textOf(json.stepsTitle),
    steps: steps && steps.length > 0 ? steps : null,
    benefits: listOf(json.benefits, benefitOf),
    questionsTitle: textOf(json.questionsTitle),
    questions: listOf(json.questions, questionOf),
    closingTitle: textOf(json.closingTitle),
    closingText: textOf(json.closingText),
    formTitle: textOf(json.formTitle),
    formSubtitle: textOf(json.formSubtitle),
    askExtraQuestion: typeof json.askExtraQuestion === 'boolean' ? json.askExtraQuestion : EMPTY_AFFILIATE_PAGE_CONTENT.askExtraQuestion,
    extraQuestion: textOf(json.extraQuestion),
    successMessage: textOf(json.successMessage),
    bannerTitle: textOf(json.bannerTitle),
    bannerText: textOf(json.bannerText),
    bannerCta: textOf(json.bannerCta),
  };
}
