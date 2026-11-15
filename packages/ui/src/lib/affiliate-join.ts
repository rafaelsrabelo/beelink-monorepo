/*
  A shop's "Seja afiliado" page as the shop window draws it (plan 2026-11-14): every text already the
  shop's or the product's own, its marks filled in by the web. The form's values are what is typed.
*/

/** The page's body, in words. */
export interface AffiliateJoinPageView {
  badge: string
  title: string
  subtitle: string
  ctaLabel: string
  highlights: string[]
  /** The shop's own picture beside the title; null draws how an affiliate's link looks. */
  imageUrl: string | null
  stepsTitle: string
  steps: { title: string; text: string }[]
  /** None: the section is left out. */
  benefits: { title: string; text: string }[]
  questionsTitle: string
  /** None: the section is left out. */
  questions: { question: string; answer: string }[]
  closingTitle: string
  closingText: string
}

/** The form's own words: its heading, the optional question when the page asks it, the line under it. */
export interface AffiliateJoinFormView {
  title: string
  subtitle: string
  /** Null: not asked. */
  extraQuestion: string | null
  note: string
}

export interface AffiliateJoinFormValues {
  name: string
  email: string
  /** As typed, masked. */
  phone: string
  extraAnswer: string
  accepted: boolean
  /** The field no person sees. */
  website: string
}

export type AffiliateJoinIssues = Partial<Record<"name" | "email" | "phone" | "accepted", string>>

/** The banner on the shop's home, its marks filled in. */
export interface AffiliateJoinBannerView {
  title: string
  text: string
  cta: string
}
