"use client"

// React
import { useEffect, useState, type ReactNode } from "react"

// Next
import { useRouter, useSearchParams } from "next/navigation"

// UI
import { AffiliatesFailed } from "@harness-monorepo/ui/blocks/affiliates/affiliates-failed"
import { AffiliatesSkeleton } from "@harness-monorepo/ui/blocks/affiliates/affiliates-skeleton"
import { CommissionRateList } from "@harness-monorepo/ui/blocks/affiliates/commission-rate-list"
import { TablePager } from "@harness-monorepo/ui/blocks/catalog/table-pager"
import { format } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// App
import { AppLink } from "@/components/app-link"
import { useDebouncedValue } from "@/services/addresses/use-debounced-value"
import { useCommissionTable, useSaveProductCommission } from "@/services/affiliates/affiliate-hooks"
import { useProducts } from "@/services/catalog/catalog-hooks"
import { AffiliatesFrame } from "./affiliates-frame"
import { CommissionCategoryRatesSection } from "./commission-category-rates-section"
import { CommissionGeneralRateSection } from "./commission-general-rate-section"
import { useRateDrafts } from "./use-rate-drafts"

export interface CommissionTableScreenProps {
  slug: string
  tableId: string
  locale: string
  messages: UiMessages
}

const SEARCH_DEBOUNCE_MS = 350

/**
 * One commission table's rates (IMPULSEIA-102): the general one, by category and by product, the
 * Padrão's too (the user's review, 12/11/2026). The products' search and page live in the address,
 * so a reload or the back button keeps the place; each row is saved on its own.
 */
export function CommissionTableScreen({ slug, tableId, locale, messages }: CommissionTableScreenProps) {
  const text = messages.affiliates.table
  const pager = messages.catalog.products.pager
  const router = useRouter()
  const params = useSearchParams()
  const search = params.get("search") ?? ""
  const page = Math.max(Number(params.get("page") ?? 1) || 1, 1)
  const [typed, setTyped] = useState(search)
  const [lastSeen, setLastSeen] = useState(search)
  if (search !== lastSeen) {
    // The address changed from somewhere else — the back button. Adjusted during render, so the old text never paints.
    setLastSeen(search)
    setTyped(search)
  }
  const settled = useDebouncedValue(typed, SEARCH_DEBOUNCE_MS)
  const table = useCommissionTable(slug, tableId)
  const products = useProducts(slug, { ...(search ? { search } : {}), page })
  const saveProduct = useSaveProductCommission(slug)
  const drafts = useRateDrafts({
    saved: new Map((table.data?.rates ?? []).map((rate) => [rate.productId, rate.rateBps])),
    save: (productId, rateBps) => saveProduct.mutateAsync({ tableId, productId, rateBps }),
    messages,
  })

  /** Writes the search and the page into the address; a new search starts at page one. */
  function go(nextSearch: string, nextPage: number) {
    const query = new URLSearchParams()
    if (nextSearch) query.set("search", nextSearch)
    if (nextPage > 1) query.set("page", String(nextPage))
    const suffix = query.toString()
    router.replace(`/admin/${slug}/affiliates/tables/${tableId}${suffix ? `?${suffix}` : ""}` as Parameters<typeof router.replace>[0])
  }

  useEffect(() => {
    // `settled === typed` keeps the back button working: a debounce still holding the old text would write it back.
    if (settled === typed && settled !== search) go(settled, 1)
    // `go` is rebuilt every render; what this is about is the search settling.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settled, typed, search])

  const frame = (children: ReactNode) => <AffiliatesFrame slug={slug} active="tables" messages={messages}>{children}</AffiliatesFrame>
  if (table.isPending) return frame(<AffiliatesSkeleton shape="list" />)
  if (table.isError) return frame(<AffiliatesFailed onRetry={() => void table.refetch()} messages={messages} />)

  const rows = products.data?.products ?? []
  const byId = new Map(rows.map((product) => [product.id, product]))
  const byCategory = new Map(table.data.categoryRates.map((rate) => [rate.categoryId, rate.rateBps]))
  // What a product without its own rate pays: its category's, else the table's — the order's own precedence.
  const productRows = rows.map((product) => {
    const categoryRate = product.category ? byCategory.get(product.category.id) : undefined
    return {
      id: product.id,
      name: product.name,
      imageUrl: product.images[0]?.url ?? null,
      fallbackRateBps: categoryRate ?? table.data.defaultRateBps,
      fallbackName: categoryRate !== undefined && product.category ? product.category.name : null,
      ...drafts.draftOf(product.id),
    }
  })

  return frame(
    <>
      <div className="flex flex-col gap-1">
        <AppLink href={`/admin/${slug}/affiliates/tables`} className="text-muted-foreground text-sm underline-offset-4 hover:underline">
          <span aria-hidden="true">← </span>
          {text.back}
        </AppLink>
        <h2 className="text-lg font-semibold">{table.data.name}</h2>
        <p className="text-muted-foreground text-sm">{text.intro}</p>
      </div>
      <CommissionGeneralRateSection slug={slug} table={table.data} locale={locale} messages={messages} />
      <CommissionCategoryRatesSection slug={slug} table={table.data} locale={locale} messages={messages} />
      {products.isPending ? (
        <AffiliatesSkeleton shape="list" />
      ) : (
        <CommissionRateList
          rows={productRows}
          search={typed}
          onSearch={setTyped}
          onType={drafts.type}
          onSave={(productId) => {
            const product = byId.get(productId)
            if (product) drafts.saveRow(product)
          }}
          onReset={(productId) => {
            const product = byId.get(productId)
            if (product) drafts.resetRow(product)
          }}
          issues={drafts.issues}
          busyId={drafts.busyId}
          status={drafts.status}
          emptyText={search ? text.noResults : text.empty}
          locale={locale}
          messages={messages}
        />
      )}
      <TablePager
        page={page}
        pageSize={products.data?.pageSize ?? rows.length}
        total={products.data?.total ?? 0}
        busy={products.isFetching}
        previousLabel={pager.previous}
        nextLabel={pager.next}
        rangeLabel={(from, to, count) => format(pager.range, { from: String(from), to: String(to), total: String(count) })}
        onPageChange={(next) => go(search, next)}
      />
    </>,
  )
}
