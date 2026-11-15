// Types
import type { AffiliateApplicationStatus, AffiliateApprovalMode, AffiliatePageContent } from '@harness-monorepo/contracts';

/*
  The "Seja afiliado" page and its applications (plan 2026-11-14--afiliados-candidatura-publica): the
  bounds of what a shop writes, and how long an application is kept.
*/

/** What a page reads before the shop wrote anything: every text the product's own, and the extra question asked. */
export const EMPTY_AFFILIATE_PAGE_CONTENT = {
  badge: null,
  title: null,
  subtitle: null,
  ctaLabel: null,
  highlights: null,
  imageUrl: null,
  stepsTitle: null,
  steps: null,
  benefits: null,
  questionsTitle: null,
  questions: null,
  closingTitle: null,
  closingText: null,
  formTitle: null,
  formSubtitle: null,
  askExtraQuestion: true,
  extraQuestion: null,
  successMessage: null,
  bannerTitle: null,
  bannerText: null,
  bannerCta: null,
} as const satisfies AffiliatePageContent;

/** The longest each text may be, in characters as Postgres counts them. */
export const AFFILIATE_PAGE_LIMITS = {
  badge: 40,
  title: 120,
  subtitle: 300,
  ctaLabel: 40,
  highlight: 60,
  highlights: 3,
  imageUrl: 2048,
  sectionTitle: 60,
  itemTitle: 60,
  itemText: 240,
  stepsMin: 1,
  steps: 4,
  benefits: 6,
  question: 120,
  answer: 600,
  questions: 10,
  closingTitle: 120,
  closingText: 240,
  formTitle: 60,
  formSubtitle: 160,
  extraQuestion: 80,
  successMessage: 400,
  bannerTitle: 80,
  bannerText: 160,
  bannerCta: 40,
} as const;

export const AFFILIATE_APPROVAL_MODES = ['MANUAL', 'AUTO'] as const satisfies readonly AffiliateApprovalMode[];
export const AFFILIATE_APPLICATION_STATUSES = ['PENDING', 'APPROVED', 'REFUSED'] as const satisfies readonly AffiliateApplicationStatus[];

/** The column is VARCHAR(200). */
export const AFFILIATE_EXTRA_ANSWER_MAX = 200;
/** What a robot may put in the field no person sees, before it is refused as a body rather than ignored. */
export const AFFILIATE_HONEYPOT_MAX = 500;

/** A decided application is deleted this long after its decision: the affiliate's row keeps what an approval needed. */
export const AFFILIATE_APPLICATION_TTL_MS = 90 * 24 * 60 * 60 * 1000;

export const AFFILIATE_APPLICATIONS_PAGE_SIZE = 20;
export const AFFILIATE_APPLICATIONS_PAGE_SIZE_MAX = 100;
export const AFFILIATE_APPLICATIONS_PAGE_MAX = 10_000;
