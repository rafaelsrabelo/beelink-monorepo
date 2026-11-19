"use client"

// React
import { useState } from "react"

// UI
import { AffiliatePageEditor, type AffiliatePagePart } from "@harness-monorepo/ui/blocks/affiliates/affiliate-page-editor"
import { AffiliatesFailed } from "@harness-monorepo/ui/blocks/affiliates/affiliates-failed"
import { AffiliatesSkeleton } from "@harness-monorepo/ui/blocks/affiliates/affiliates-skeleton"
import type { AffiliatePageContentValues, AffiliatePageIssues } from "@harness-monorepo/ui/lib/affiliate-page"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// App
import { AppLink } from "@/components/app-link"
import { joinMarksOf } from "@/lib/affiliate-join"
import { contentIssuesOf, contentOf, contentValuesOf, pageAddressOf, pageErrorOf, previewOf, restoredValuesOf } from "@/lib/affiliate-page-form"
import { AffiliateError } from "@/services/affiliates/affiliate-requests"
import { useAffiliatePage, useSaveAffiliatePage } from "@/services/affiliates/affiliate-page-hooks"
import { useStore } from "@/services/stores/store-hooks"
import { useImageUpload } from "@/services/uploads/upload-hooks"

export interface AffiliatePageEditorScreenProps {
  slug: string
  origin: string
  locale: string
  messages: UiMessages
}

const NO_ISSUES: AffiliatePageIssues = {}

/**
 * Every text of the shop's "Seja afiliado" page (plan 2026-11-14), on a screen of its own: the editor
 * starts from the page as saved — the product's own texts where the shop wrote none — and holds what
 * is typed until it is saved, with the settings as they stand.
 */
export function AffiliatePageEditorScreen({ slug, origin, locale, messages }: AffiliatePageEditorScreenProps) {
  const defaults = messages.affiliateJoin.defaults
  const text = messages.affiliatePage
  const page = useAffiliatePage(slug)
  const store = useStore(slug)
  const save = useSaveAffiliatePage(slug)
  const image = useImageUpload()
  // What was typed since the page was read; null shows it as saved.
  const [typed, setTyped] = useState<AffiliatePageContentValues | null>(null)
  const [issues, setIssues] = useState<AffiliatePageIssues>(NO_ISSUES)

  if (page.isPending || store.isPending) return <AffiliatesSkeleton />
  if (page.isError || store.isError) return <AffiliatesFailed onRetry={() => void Promise.all([page.refetch(), store.refetch()])} messages={messages} />

  const settings = page.data.page
  const value = typed ?? contentValuesOf(settings.content, defaults)
  const marks = joinMarksOf(store.data, page.data, messages.affiliateJoin, locale)

  function change(next: AffiliatePageContentValues) {
    if (save.error || save.isSuccess) save.reset()
    setIssues(NO_ISSUES)
    setTyped(next)
  }

  function submit() {
    const found = contentIssuesOf(value, text.editor)
    if (Object.keys(found).length > 0) return setIssues(found)
    const { open, placements, tableId, approval } = settings
    save.mutate({ open, placements, tableId, approval, content: contentOf(value, defaults) }, { onSuccess: () => setTyped(null) })
  }

  return (
    <AffiliatePageEditor
      value={value}
      onChange={change}
      onRestore={(part: AffiliatePagePart) => change(restoredValuesOf(value, part, defaults))}
      onSubmit={submit}
      preview={previewOf(value, defaults, marks)}
      backHref={`/admin/${slug}/affiliates/settings`}
      viewHref={pageAddressOf(store.data, origin).href}
      onUpload={image.upload}
      uploading={image.pending}
      issues={issues}
      pending={save.isPending}
      error={save.error ? pageErrorOf(save.error instanceof AffiliateError ? save.error.errorCode : "UNKNOWN", text.errors) : undefined}
      saved={save.isSuccess}
      linkComponent={AppLink}
      messages={messages}
    />
  )
}
