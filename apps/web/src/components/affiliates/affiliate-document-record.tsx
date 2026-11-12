"use client"

// React
import { useState } from "react"

// Types
import type { ShopAffiliate } from "@harness-monorepo/contracts"

// UI
import { AffiliateDocumentSection } from "@harness-monorepo/ui/blocks/affiliates/affiliate-document-section"
import { format } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// App
import { affiliateErrorOf } from "@/lib/affiliate-form"
import { affiliateDateFormatter } from "@/lib/affiliate-people"
import { DOCUMENT_ACCEPT, DOCUMENT_TYPES, documentFilesOf, documentPayloadOf } from "@/lib/affiliate-wizard"
import { useAffiliateDocument, useReplaceAffiliateDocument } from "@/services/affiliates/affiliate-document-hooks"
import { AffiliateError } from "@/services/affiliates/affiliate-requests"
import { useDocumentDraft } from "./wizard/use-document-draft"

export interface AffiliateDocumentRecordProps {
  slug: string
  affiliate: ShopAffiliate
  locale: string
  messages: UiMessages
}

/**
 * An affiliate's identity document on their record (12/11/2026): the photos, at links read anew
 * before they expire — or, when the invite went without it, "Documento pendente" and the upload.
 */
export function AffiliateDocumentRecord({ slug, affiliate, locale, messages }: AffiliateDocumentRecordProps) {
  const text = messages.affiliates.wizard.document
  const sent = affiliate.document
  const links = useAffiliateDocument(slug, affiliate.id, sent !== null)
  const replace = useReplaceAffiliateDocument(slug, affiliate.id)
  const draft = useDocumentDraft(slug, messages)
  const [replacing, setReplacing] = useState(false)
  const outcome = documentPayloadOf(draft.draft, text)
  const canSend = "document" in outcome && outcome.document !== null

  const document = sent
    ? {
        summary: format(messages.affiliates.documentSection.summary, { type: text.types[sent.type], date: affiliateDateFormatter(locale)(sent.uploadedAt) }),
        files: links.data
          ? [
              { label: text.sides.front, url: links.data.frontUrl, pdf: links.data.frontFormat === "pdf" },
              ...(links.data.backUrl ? [{ label: text.sides.back, url: links.data.backUrl, pdf: links.data.backFormat === "pdf" }] : []),
            ]
          : [],
      }
    : null

  return (
    <AffiliateDocumentSection
      document={document}
      loading={sent !== null && links.isPending}
      replacing={replacing}
      onReplace={() => setReplacing(true)}
      onCancel={() => {
        draft.clear()
        setReplacing(false)
      }}
      fields={{
        types: DOCUMENT_TYPES.map((type) => ({ value: type, label: text.types[type] })),
        type: draft.draft.type,
        onType: (type) => draft.setType(DOCUMENT_TYPES.find((one) => one === type) ?? "RG"),
        files: documentFilesOf(draft.draft, text, locale),
        accept: DOCUMENT_ACCEPT,
        onFile: draft.choose,
        onRemove: draft.remove,
      }}
      onSend={() => {
        if (!("document" in outcome) || !outcome.document) return
        replace.mutate(outcome.document, {
          onSuccess: () => {
            draft.clear()
            setReplacing(false)
          },
        })
      }}
      canSend={canSend}
      sending={replace.isPending}
      error={"refusal" in outcome ? outcome.refusal : replace.error ? affiliateErrorOf(replace.error instanceof AffiliateError ? replace.error.errorCode : "UNKNOWN", messages.affiliates.errors) : undefined}
      messages={messages}
    />
  )
}
