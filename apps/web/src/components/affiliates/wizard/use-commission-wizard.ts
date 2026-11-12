"use client"

// React
import { useMemo, useState } from "react"

// Types
import type { AffiliateCommissionPayload } from "@harness-monorepo/contracts"
import type { AffiliateCommissionBaseProps } from "@harness-monorepo/ui/blocks/affiliates/affiliate-commission-base"
import type { AffiliateCommissionTreeProps } from "@harness-monorepo/ui/blocks/affiliates/affiliate-commission-tree"
import type { AffiliateReviewView } from "@harness-monorepo/ui/lib/affiliate-wizard"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// UI
import { ratePercentOf } from "@harness-monorepo/ui/lib/cashback"

// App
import { commissionChoiceOf, commissionTreeOf, customize, draftChanged, draftOf, rate, reset, type CommissionDraft } from "@/lib/affiliate-commission-draft"
import { useAffiliateProgram, useCommissionTable } from "@/services/affiliates/affiliate-hooks"
import { useProductCategories, useWholeProductList } from "@/services/catalog/catalog-hooks"

export interface CommissionWizard {
  /** Everything the step draws is read. */
  ready: boolean
  failed: boolean
  retry: () => void
  base: Omit<AffiliateCommissionBaseProps, "messages">
  tree: Omit<AffiliateCommissionTreeProps, "messages">
  /** The invite's part: the shared table, or the affiliate's own commission. */
  choice: () => { tableId: string } | { commission: AffiliateCommissionPayload } | null
  review: { base: string; startName: string | null; rules: AffiliateReviewView["rules"] }
  restart: () => void
}

/**
 * The commission step (the user's design, 12/11/2026): the shop's shared tables to start from, the
 * draft seeded by the one chosen — and kept as typed while that one stays chosen — and the tree of
 * categories and products. Choosing another start starts the draft again from it.
 */
export function useCommissionWizard(slug: string, locale: string, messages: UiMessages): CommissionWizard {
  const text = messages.affiliates.wizard
  const program = useAffiliateProgram(slug)
  const categories = useProductCategories(slug)
  const products = useWholeProductList(slug)
  const [startId, setStartId] = useState<string | null>(null)
  const [own, setOwn] = useState<CommissionDraft | null>(null)
  const [search, setSearch] = useState("")
  const [open, setOpen] = useState<ReadonlySet<string>>(new Set())

  const shared = (program.data?.tables ?? []).filter((table) => table.affiliate === null)
  const chosenId = startId ?? shared.find((table) => table.isDefault)?.id ?? shared[0]?.id
  const start = useCommissionTable(slug, chosenId)
  const draft = start.data ? (own && own.startId === start.data.id ? own : draftOf(start.data)) : null
  const categoryById = useMemo(() => new Map((products.data ?? []).map((product) => [product.id, product.category?.id ?? null])), [products.data])
  const categoryOf = (productId: string) => categoryById.get(productId) ?? null
  const update = (change: (current: CommissionDraft) => CommissionDraft) => {
    if (draft) setOwn(change(draft))
  }

  const empty: CommissionDraft = { startId: "", baseBps: 0, categories: {}, products: {} }
  const shown = draft ?? empty
  const names = new Map([...(categories.data ?? []).map((category) => [category.id, category.name] as const), ...(products.data ?? []).map((product) => [product.id, product.name] as const)])
  const rules: AffiliateReviewView["rules"] = draft
    ? [
        ...Object.entries(draft.categories).map(([id, bps]) => ({ kindLabel: text.review.category, name: names.get(id) ?? "", value: ratePercentOf(bps, locale) })),
        ...Object.entries(draft.products).map(([id, bps]) => ({ kindLabel: text.review.product, name: names.get(id) ?? "", value: ratePercentOf(bps, locale) })),
      ]
    : []

  return {
    ready: Boolean(draft && categories.data && products.data),
    failed: program.isError || start.isError || categories.isError || products.isError,
    retry: () => void Promise.all([program.refetch(), start.refetch(), categories.refetch(), products.refetch()]),
    base: {
      starts: shared.map((table) => ({ id: table.id, label: `${table.name} · ${ratePercentOf(table.defaultRateBps, locale)}` })),
      startId: chosenId ?? "",
      onStart: (tableId) => {
        setStartId(tableId)
        setOwn(null)
      },
      base: shown.baseBps / 100,
      onBase: (percent) => update((current) => ({ ...current, baseBps: Math.round(percent * 100) })),
    },
    tree: {
      categories: commissionTreeOf({ categories: categories.data ?? [], products: products.data ?? [], draft: shown, search, open, locale, text: text.commission }),
      search,
      onSearch: setSearch,
      onToggle: (id) => setOpen((current) => (current.has(id) ? new Set([...current].filter((one) => one !== id)) : new Set([...current, id]))),
      onCustomize: (target) => update((current) => customize(current, target, categoryOf)),
      onRate: (target, percent) => update((current) => rate(current, target, percent)),
      onReset: (target) => update((current) => reset(current, target)),
    },
    choice: () => (draft && start.data ? commissionChoiceOf(draft, start.data) : null),
    review: {
      base: ratePercentOf(shown.baseBps, locale),
      startName: draft && start.data && !draftChanged(draft, start.data) ? start.data.name : null,
      rules,
    },
    restart: () => {
      setStartId(null)
      setOwn(null)
      setSearch("")
      setOpen(new Set())
    },
  }
}
