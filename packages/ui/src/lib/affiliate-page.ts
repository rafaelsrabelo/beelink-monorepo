/*
  The "Seja afiliado" page as the panel's blocks draw it (plan 2026-11-14): its settings, its texts as
  typed and the applications it took, already in words. The screens own the crossing to the wire.
*/

/** `MANUAL`: each application waits for the shopkeeper. `AUTO`: it becomes an invite at once. */
export type AffiliateApprovalValue = "MANUAL" | "AUTO"

/** The settings card as typed. `tableId` is always a table's: the screen reads the API's null as the default one. */
export interface AffiliatePageCardValues {
  open: boolean
  homeBanner: boolean
  footerLink: boolean
  topStrip: boolean
  tableId: string
  approval: AffiliateApprovalValue
}

/** Two texts of one item: a step or a benefit (title, text), a question (title is the question, text the answer). */
export interface AffiliatePagePairValue {
  title: string
  text: string
}

/** The page's texts as typed, every one shown — the product's own where the shop wrote none. */
export interface AffiliatePageContentValues {
  badge: string
  title: string
  subtitle: string
  ctaLabel: string
  highlights: string[]
  imageUrl: string | null
  stepsTitle: string
  steps: AffiliatePagePairValue[]
  benefits: AffiliatePagePairValue[]
  questionsTitle: string
  questions: AffiliatePagePairValue[]
  closingTitle: string
  closingText: string
  formTitle: string
  formSubtitle: string
  askExtraQuestion: boolean
  extraQuestion: string
  successMessage: string
  bannerTitle: string
  bannerText: string
  bannerCta: string
}

/** The bounds the API keeps (plan 2026-11-14), quoted under each field. */
export const AFFILIATE_PAGE_MAX = {
  badge: 40,
  title: 120,
  subtitle: 300,
  ctaLabel: 40,
  highlight: 60,
  highlights: 3,
  sectionTitle: 60,
  stepsTitle: 60,
  questionsTitle: 60,
  itemTitle: 60,
  itemText: 240,
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
} as const

/** A text field of the page, by its key. */
export type AffiliatePageTextKey = {
  [K in keyof AffiliatePageContentValues]: AffiliatePageContentValues[K] extends string ? K : never
}[keyof AffiliatePageContentValues]

/** A list of pairs of the page. */
export type AffiliatePagePairListKey = "steps" | "benefits" | "questions"

/** What does not hold, by field: `title`, `highlights.1`, `steps.0.text`. */
export type AffiliatePageIssues = Partial<Record<string, string>>

/** The top of the page as a visitor will read it, its marks already filled in. */
export interface AffiliatePagePreviewView {
  badge: string
  title: string
  subtitle: string
  ctaLabel: string
  highlights: string[]
  imageUrl: string | null
}

export type AffiliateApplicationStatusValue = "PENDING" | "APPROVED" | "REFUSED"
export const AFFILIATE_APPLICATION_STATUS_VALUES: readonly AffiliateApplicationStatusValue[] = ["PENDING", "APPROVED", "REFUSED"]

/** One application, in words. */
export interface AffiliateApplicationView {
  id: string
  name: string
  email: string
  /** "(11) 95555-4444". */
  phone: string
  /** The question asked and its answer; null when none was answered. */
  extra: { question: string; answer: string } | null
  /** "14/11, 14:32". */
  received: string
  status: AffiliateApplicationStatusValue
  /** Where an approval stands, in words; null while pending or refused. */
  outcome: string | null
}
