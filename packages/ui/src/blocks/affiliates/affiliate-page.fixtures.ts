// Locales
import { ptBR } from "@harness-monorepo/ui/locales/index"

// Block
import type { AffiliateApplicationView, AffiliatePageCardValues, AffiliatePageContentValues, AffiliatePagePreviewView } from "@harness-monorepo/ui/lib/affiliate-page"
import type { AffiliateTableOption } from "@harness-monorepo/ui/lib/affiliates"

const defaults = ptBR.affiliateJoin.defaults

export const pageTables: AffiliateTableOption[] = [
  { id: "padrao", name: "Padrão", rate: "10%" },
  { id: "revenda", name: "Revendedoras", rate: "15%" },
]

export const pageCard: AffiliatePageCardValues = { open: true, footerLink: true, topStrip: false, tableId: "padrao", approval: "MANUAL" }

/** A page whose shop wrote nothing: the product's own texts, marks and all. */
export const pageContent: AffiliatePageContentValues = {
  badge: defaults.badge,
  title: defaults.title,
  subtitle: defaults.subtitle,
  ctaLabel: defaults.ctaLabel,
  highlights: [...defaults.highlights],
  imageUrl: null,
  stepsTitle: defaults.stepsTitle,
  steps: defaults.steps.map((step) => ({ ...step })),
  benefits: defaults.benefits.map((benefit) => ({ ...benefit })),
  questionsTitle: defaults.questionsTitle,
  questions: defaults.questions.map(({ question, answer }) => ({ title: question, text: answer })),
  closingTitle: defaults.closingTitle,
  closingText: defaults.closingText,
  formTitle: defaults.formTitle,
  formSubtitle: defaults.formSubtitle,
  askExtraQuestion: true,
  extraQuestion: defaults.extraQuestion,
  successMessage: defaults.successMessage,
  bannerTitle: defaults.bannerTitle,
  bannerText: defaults.bannerText,
  bannerCta: defaults.bannerCta,
}

export const pagePreview: AffiliatePagePreviewView = {
  badge: "Programa de afiliados",
  title: "Indique a Lessari e ganhe 10% em cada venda",
  subtitle: defaults.subtitle,
  ctaLabel: defaults.ctaLabel,
  highlights: [...defaults.highlights],
  imageUrl: null,
}

export const applications: AffiliateApplicationView[] = [
  { id: "a", name: "Ana Souza", email: "ana.souza@exemplo.com", phone: "(11) 90000-0001", extra: { question: "Onde vai divulgar", answer: "@ana.treinos no Instagram" }, received: "14/11, 14:32", status: "PENDING", outcome: null },
  { id: "b", name: "Bruno Lima", email: "bruno.lima@exemplo.com", phone: "(21) 90000-0002", extra: null, received: "14/11, 09:10", status: "PENDING", outcome: null },
]

export const decided: AffiliateApplicationView[] = [
  { id: "c", name: "Carla Dias", email: "carla.dias@exemplo.com", phone: "(31) 90000-0003", extra: null, received: "13/11, 21:47", status: "APPROVED", outcome: "Convite enviado" },
]

export const filterHrefs = { PENDING: "#novas", APPROVED: "#aprovadas", REFUSED: "#recusadas" } as const
