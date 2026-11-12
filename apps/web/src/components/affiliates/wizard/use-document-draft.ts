"use client"

// React
import { useEffect, useRef, useState } from "react"

// Types
import type { AffiliateDocumentType } from "@harness-monorepo/contracts"
import type { AffiliateDocumentSide } from "@harness-monorepo/ui/lib/affiliate-wizard"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// App
import { affiliateErrorOf } from "@/lib/affiliate-form"
import { emptyDocument, fileRefusalOf, type DocumentDraft } from "@/lib/affiliate-wizard"
import { useStageAffiliateDocument } from "@/services/affiliates/affiliate-document-hooks"
import { AffiliateError } from "@/services/affiliates/affiliate-requests"

export interface DocumentDraftHandle {
  draft: DocumentDraft
  setType: (type: AffiliateDocumentType) => void
  choose: (side: AffiliateDocumentSide, file: File) => void
  remove: (side: AffiliateDocumentSide) => void
  clear: () => void
}

const previewOf = (file: File): string | null => (file.type.startsWith("image/") && typeof URL.createObjectURL === "function" ? URL.createObjectURL(file) : null)
const revoke = (url: string | null | undefined) => {
  if (url && typeof URL.revokeObjectURL === "function") URL.revokeObjectURL(url)
}

/**
 * The document's photos while a form is filled in (12/11/2026): each side is uploaded the moment it
 * is chosen — privately, waiting a day to be named — so the step can say at once what failed. A file
 * the browser can tell is wrong is refused before it is sent; a side chosen again while its last
 * upload is still on its way ignores that upload's answer.
 */
export function useDocumentDraft(slug: string, messages: UiMessages): DocumentDraftHandle {
  const text = messages.affiliates.wizard.document
  const stage = useStageAffiliateDocument(slug)
  const [draft, setDraft] = useState<DocumentDraft>(emptyDocument)
  const turns = useRef({ front: 0, back: 0 })
  const shown = useRef<DocumentDraft>(draft)
  useEffect(() => {
    shown.current = draft
  }, [draft])

  // The previews are this tab's own: let them go when the form does.
  useEffect(() => () => [shown.current.front?.previewUrl, shown.current.back?.previewUrl].forEach(revoke), [])

  function choose(side: AffiliateDocumentSide, file: File) {
    const turn = (turns.current[side] += 1)
    revoke(shown.current[side]?.previewUrl)
    const refusal = fileRefusalOf(file, text)
    const base = { fileName: file.name, bytes: file.size, previewUrl: previewOf(file), uploadId: null }
    setDraft((current) => ({ ...current, [side]: refusal ? { ...base, status: "failed", error: refusal } : { ...base, status: "uploading" } }))
    if (refusal) return

    stage
      .mutateAsync(file)
      .then(({ id }) => {
        if (turns.current[side] !== turn) return
        setDraft((current) => (current[side] ? { ...current, [side]: { ...current[side], status: "ready", uploadId: id } } : current))
      })
      .catch((error: unknown) => {
        if (turns.current[side] !== turn) return
        const code = error instanceof AffiliateError ? error.errorCode : "UNKNOWN"
        setDraft((current) => (current[side] ? { ...current, [side]: { ...current[side], status: "failed", error: affiliateErrorOf(code, messages.affiliates.errors) } } : current))
      })
  }

  function remove(side: AffiliateDocumentSide) {
    turns.current[side] += 1
    revoke(shown.current[side]?.previewUrl)
    setDraft((current) => ({ ...current, [side]: null }))
  }

  return {
    draft,
    // A passport has no back: one chosen before goes with the type.
    setType: (type) => {
      if (type === "PASSPORT") remove("back")
      setDraft((current) => ({ ...current, type }))
    },
    choose,
    remove,
    clear: () => {
      remove("front")
      remove("back")
      setDraft(emptyDocument())
    },
  }
}
