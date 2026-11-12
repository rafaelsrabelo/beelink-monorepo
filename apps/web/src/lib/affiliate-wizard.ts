// Types
import type { AffiliateCommissionPayload, AffiliateDocumentPayload, AffiliateDocumentType, CreateAffiliatePayload } from "@harness-monorepo/contracts"
import type { AffiliateDocumentFileView, AffiliateDocumentSide, AffiliatePersonIssues, AffiliatePersonValues, AffiliateReviewView, AffiliateWizardStepView } from "@harness-monorepo/ui/lib/affiliate-wizard"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// UI
import { isCpf } from "@harness-monorepo/ui/lib/cpf"
import { format } from "@harness-monorepo/ui/locales/index"

/*
  The step-by-step invite (the user's design, 12/11/2026), as rules: what each step asks before it
  lets the next one open, the document's photos while they upload, and the invite the API takes.
*/

type Wizard = UiMessages["affiliates"]["wizard"]

export const WIZARD_STEPS = ["person", "commission", "document", "review"] as const
export type WizardStep = (typeof WIZARD_STEPS)[number]

export const DOCUMENT_TYPES: readonly AffiliateDocumentType[] = ["RG", "CNH", "CIN", "RNE_CRNM", "PASSPORT"]
/** What the API stores as a document: the same list it checks. */
export const DOCUMENT_ACCEPT = "image/jpeg,image/png,image/webp,application/pdf"
export const DOCUMENT_MAX_BYTES = 8 * 1024 * 1024

const NAME = { min: 2, max: 120 }
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const digitsOf = (text: string): string => text.replace(/\D/g, "")

export function wizardStepsOf(current: number, text: Wizard): AffiliateWizardStepView[] {
  return WIZARD_STEPS.map((key, index) => ({ label: text.steps[key].label, hint: text.steps[key].hint, state: index < current ? "done" : index === current ? "current" : "pending" }))
}

/** Step one's refusals, field by field: every field is required, and the CPF's check digits are checked here too. */
export function personIssuesOf(value: AffiliatePersonValues, text: UiMessages["affiliates"]["affiliateIssues"]): AffiliatePersonIssues {
  const name = [...value.name.trim()].length
  const phone = digitsOf(value.phone).length
  return {
    ...(name < NAME.min || name > NAME.max ? { name: text.name } : {}),
    ...(EMAIL.test(value.email.trim()) ? {} : { email: text.email }),
    ...(phone === 10 || phone === 11 ? {} : { phone: text.phone }),
    ...(isCpf(value.cpf) ? {} : { cpf: text.cpf }),
  }
}

/** One side of the document while the invite is filled in: the file chosen, and its upload. */
export interface DocumentSideDraft {
  fileName: string
  bytes: number
  /** A local preview of a photo; null for a PDF. */
  previewUrl: string | null
  status: "uploading" | "ready" | "failed"
  uploadId: string | null
  error?: string
}

export interface DocumentDraft {
  type: AffiliateDocumentType
  front: DocumentSideDraft | null
  back: DocumentSideDraft | null
}

export const emptyDocument = (): DocumentDraft => ({ type: "RG", front: null, back: null })

export const sidesOf = (type: AffiliateDocumentType): AffiliateDocumentSide[] => (type === "PASSPORT" ? ["front"] : ["front", "back"])

/** What the browser can refuse before sending: a file that is not a photo or a PDF, or past 8 MB. */
export function fileRefusalOf(file: File, text: Wizard["document"]): string | null {
  if (!DOCUMENT_ACCEPT.split(",").includes(file.type)) return text.wrongType
  if (file.size > DOCUMENT_MAX_BYTES) return text.tooLarge
  return null
}

const sizeOf = (bytes: number, locale: string): string =>
  bytes >= 1024 * 1024 ? `${new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(bytes / (1024 * 1024))} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`

export function documentFilesOf(draft: DocumentDraft, text: Wizard["document"], locale: string): AffiliateDocumentFileView[] {
  return sidesOf(draft.type).map((side) => {
    const chosen = draft[side]
    return {
      side,
      label: text.sides[side],
      fileName: chosen?.fileName ?? null,
      size: chosen ? sizeOf(chosen.bytes, locale) : null,
      previewUrl: chosen?.previewUrl ?? null,
      status: chosen ? chosen.status : "empty",
      ...(chosen?.error ? { error: chosen.error } : {}),
    }
  })
}

/**
 * The document the invite names: none when nothing was chosen ("Dá para anexar depois"), the payload
 * once every side it needs is uploaded — or, in words, why the step cannot go on yet.
 */
export function documentPayloadOf(draft: DocumentDraft, text: Wizard["document"]): { document: AffiliateDocumentPayload | null } | { refusal: string } {
  const sides = sidesOf(draft.type).map((side) => draft[side])
  if (sides.every((side) => side === null)) return { document: null }
  if (sides.some((side) => side?.status === "uploading")) return { refusal: text.stillUploading }
  if (sides.some((side) => side === null || side.status !== "ready" || !side.uploadId)) return { refusal: text.incomplete }
  const [front, back] = sides
  return { document: { type: draft.type, frontUploadId: front!.uploadId!, backUploadId: back?.uploadId ?? null } }
}

export function invitePayloadOf(input: { person: AffiliatePersonValues; commission: { tableId: string } | { commission: AffiliateCommissionPayload }; document: AffiliateDocumentPayload | null; note: string }): CreateAffiliatePayload {
  const note = input.note.trim()
  return {
    name: input.person.name.trim(),
    email: input.person.email.trim().toLowerCase(),
    phone: input.person.phone.trim(),
    cpf: digitsOf(input.person.cpf),
    ...input.commission,
    ...(input.document ? { document: input.document } : {}),
    note: note || null,
  }
}

/** Step four's cards, in words. */
export function reviewOf(input: {
  person: AffiliatePersonValues
  base: string
  startName: string | null
  rules: AffiliateReviewView["rules"]
  document: DocumentDraft
  text: Wizard
}): AffiliateReviewView {
  const { text, document } = input
  const sides = sidesOf(document.type)
  const any = sides.some((side) => document[side] !== null)
  return {
    name: input.person.name.trim(),
    email: input.person.email.trim(),
    contact: [input.person.phone, input.person.cpf ? `CPF ${input.person.cpf}` : ""].filter(Boolean).join(" · "),
    commissionBase: input.base,
    commissionHint: input.startName ? format(text.commission.startsFrom, { name: input.startName }) : text.review.baseHint,
    rules: input.rules,
    documentTitle: any ? format(text.review.document, { type: text.document.types[document.type] }) : text.review.noDocument,
    documentLines: any ? sides.map((side) => ({ label: text.document.sides[side], status: document[side]?.fileName ?? text.review.notAttached })) : [{ label: text.document.later, status: "" }],
  }
}
