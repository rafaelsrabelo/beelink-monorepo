"use client"

// React
import { useState } from "react"

// Types
import type { CommissionTableSummary } from "@harness-monorepo/contracts"

// UI
import { AffiliatePageCard } from "@harness-monorepo/ui/blocks/affiliates/affiliate-page-card"
import { AffiliatesFailed } from "@harness-monorepo/ui/blocks/affiliates/affiliates-failed"
import { AffiliatesSkeleton } from "@harness-monorepo/ui/blocks/affiliates/affiliates-skeleton"
import type { AffiliatePageCardValues } from "@harness-monorepo/ui/lib/affiliate-page"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// App
import { AppLink } from "@/components/app-link"
import { cardValuesOf, pageAddressOf, pageErrorOf, pagePayloadOf, pageStatusOf } from "@/lib/affiliate-page-form"
import { affiliateTableOptionsOf } from "@/lib/affiliate-people"
import { AffiliateError } from "@/services/affiliates/affiliate-requests"
import { useAffiliatePage, useSaveAffiliatePage } from "@/services/affiliates/affiliate-page-hooks"
import { useStore } from "@/services/stores/store-hooks"

export interface AffiliatePageCardSectionProps {
  slug: string
  /** The platform's own origin, for the page's address on a shop with no domain of its own. */
  origin: string
  /** The programme's tables, the default first, as its overview lists them. */
  tables: readonly CommissionTableSummary[]
  locale: string
  messages: UiMessages
}

/**
 * The "Seja afiliado" page in the programme's settings (plan 2026-11-14). What is chosen here is saved
 * with the page's texts as they stand, so the card and the editor never undo each other.
 */
export function AffiliatePageCardSection({ slug, origin, tables, locale, messages }: AffiliatePageCardSectionProps) {
  const text = messages.affiliatePage
  const page = useAffiliatePage(slug)
  const store = useStore(slug)
  const save = useSaveAffiliatePage(slug)
  // What was chosen since the page was read; null shows it as saved.
  const [typed, setTyped] = useState<AffiliatePageCardValues | null>(null)
  const [copied, setCopied] = useState(false)

  if (page.isPending || store.isPending) return <AffiliatesSkeleton />
  if (page.isError || store.isError) return <AffiliatesFailed onRetry={() => void Promise.all([page.refetch(), store.refetch()])} messages={messages} />

  const defaultTableId = tables.find((table) => table.isDefault)?.id ?? ""
  const value = typed ?? cardValuesOf(page.data.page, defaultTableId)
  const address = pageAddressOf(store.data, origin)

  function change(next: AffiliatePageCardValues) {
    if (save.error || save.isSuccess) save.reset()
    setTyped(next)
  }

  function submit() {
    if (!page.data) return
    save.mutate(pagePayloadOf(value, page.data.page.content, defaultTableId), { onSuccess: () => setTyped(null) })
  }

  function copy() {
    void navigator.clipboard.writeText(address.href).then(() => setCopied(true))
  }

  return (
    <AffiliatePageCard
      value={value}
      onChange={change}
      onSubmit={submit}
      address={address.address}
      viewHref={address.href}
      editHref={`/admin/${slug}/affiliates/join-page`}
      tables={affiliateTableOptionsOf(tables, locale)}
      status={pageStatusOf(page.data, text.card)}
      onCopy={copy}
      copied={copied}
      pending={save.isPending}
      error={save.error ? pageErrorOf(save.error instanceof AffiliateError ? save.error.errorCode : "UNKNOWN", text.errors) : undefined}
      saved={save.isSuccess}
      linkComponent={AppLink}
      messages={messages}
    />
  )
}
