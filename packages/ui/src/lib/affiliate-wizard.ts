/**
 * The step-by-step invite of an affiliate (the user's design, 12/11/2026), as its blocks read it:
 * every value already in words, every choice a callback. The screen owns the draft and the rules.
 */

export type AffiliateWizardStepState = "done" | "current" | "pending"

export interface AffiliateWizardStepView {
  label: string
  hint: string
  state: AffiliateWizardStepState
}

/** Step one, as typed — the phone and the CPF already masked. */
export interface AffiliatePersonValues {
  name: string
  email: string
  phone: string
  cpf: string
}

export type AffiliatePersonIssues = Partial<Record<keyof AffiliatePersonValues, string>>

/** A table to start the commission from: a shared one, said with its rate. */
export interface AffiliateStartOption {
  id: string
  /** "Padrão · 10%". */
  label: string
}

/** A product in the commission's tree: what it pays, and where that comes from. */
export interface CommissionTreeProduct {
  id: string
  name: string
  /** "R$ 189,90". */
  price: string
  /** What the affiliate earns per sale at the rate it has: "R$ 18,99". */
  earn: string
  /** A rate of its own here, rather than its category's or the base. */
  own: boolean
  /** Whole percent, 0 to 100. */
  percent: number
  /** When it inherits: "Segue a categoria · 15%". */
  inheritLabel: string
}

export interface CommissionTreeCategory {
  id: string
  name: string
  /** "4 produtos · 1 personalizado". */
  countLabel: string
  own: boolean
  percent: number
  /** When it inherits: "Segue o padrão · 10%". */
  inheritLabel: string
  open: boolean
  products: CommissionTreeProduct[]
  /** False for the products with no category, gathered under a name: there is no category to rate. */
  customizable?: boolean
}

export type CommissionTarget = { kind: "category" | "product"; id: string }

/** The document's photos, each as the step shows it. */
export type AffiliateDocumentSide = "front" | "back"

export interface AffiliateDocumentFileView {
  side: AffiliateDocumentSide
  /** "Frente", "Verso". */
  label: string
  /** Null while nothing was chosen. */
  fileName: string | null
  /** "1,2 MB". */
  size: string | null
  /** A local preview of a photo; null for a PDF or before a file. */
  previewUrl: string | null
  status: "empty" | "uploading" | "ready" | "failed"
  /** The upload's refusal, in words. */
  error?: string
}

export interface AffiliateDocumentTypeOption {
  value: string
  label: string
}

/** Step four's cards, each in words. */
export interface AffiliateReviewView {
  name: string
  email: string
  /** "(11) 99999-8888 · CPF 529.982.247-25". */
  contact: string
  /** "10%". */
  commissionBase: string
  /** "da venda, valor base" — or where it starts from, when nothing changed. */
  commissionHint: string
  rules: Array<{ kindLabel: string; name: string; value: string }>
  /** "Documento (RG)". */
  documentTitle: string
  documentLines: Array<{ label: string; status: string }>
}

const digits = (typed: string, max: number): string => typed.replace(/\D/g, "").slice(0, max)

/** A Brazilian phone as typed so far: `(11) 99999-8888`, or `(11) 3333-4444` with ten digits. */
export function maskPhone(typed: string): string {
  const d = digits(typed, 11)
  if (!d) return ""
  const local = d.length > 10 ? [d.slice(2, 7), d.slice(7)] : [d.slice(2, 6), d.slice(6)]
  return `(${d.slice(0, 2)}${d.length > 2 ? `) ${local[0]}` : ""}${local[1] ? `-${local[1]}` : ""}`
}

/** A percent as the panel says it: whole, with the sign. */
export function percentLabel(percent: number): string {
  return `${percent}%`
}
