"use client"

// Types
import type { CommissionTable } from "@harness-monorepo/contracts"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// UI
import { AffiliatesSkeleton } from "@harness-monorepo/ui/blocks/affiliates/affiliates-skeleton"
import { CommissionCategoryRateList } from "@harness-monorepo/ui/blocks/affiliates/commission-category-rate-list"

// App
import { useSaveCategoryCommission } from "@/services/affiliates/affiliate-hooks"
import { useProductCategories } from "@/services/catalog/catalog-hooks"
import { useRateDrafts } from "./use-rate-drafts"

export interface CommissionCategoryRatesSectionProps {
  slug: string
  table: CommissionTable
  locale: string
  messages: UiMessages
}

/** A table's rates by category (the user's review, 12/11/2026): every category of the shop, each saved on its own. */
export function CommissionCategoryRatesSection({ slug, table, locale, messages }: CommissionCategoryRatesSectionProps) {
  const categories = useProductCategories(slug)
  const save = useSaveCategoryCommission(slug)
  const drafts = useRateDrafts({
    saved: new Map(table.categoryRates.map((rate) => [rate.categoryId, rate.rateBps])),
    save: (categoryId, rateBps) => save.mutateAsync({ tableId: table.id, categoryId, rateBps }),
    messages,
  })

  if (categories.isPending) return <AffiliatesSkeleton shape="list" />

  const list = categories.data ?? []
  const byId = new Map(list.map((category) => [category.id, category]))
  const rows = list.map((category) => ({ id: category.id, name: category.name, fallbackRateBps: table.defaultRateBps, fallbackName: null, ...drafts.draftOf(category.id) }))

  return (
    <CommissionCategoryRateList
      rows={rows}
      onType={drafts.type}
      onSave={(id) => {
        const category = byId.get(id)
        if (category) drafts.saveRow(category)
      }}
      onReset={(id) => {
        const category = byId.get(id)
        if (category) drafts.resetRow(category)
      }}
      issues={drafts.issues}
      busyId={drafts.busyId}
      status={drafts.status}
      locale={locale}
      messages={messages}
    />
  )
}
