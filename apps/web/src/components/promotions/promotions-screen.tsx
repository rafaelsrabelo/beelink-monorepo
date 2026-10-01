"use client"

// React
import { useRef, useState } from "react"

// Next
import { useRouter, useSearchParams } from "next/navigation"

// Types
import type { PromotionStatus } from "@harness-monorepo/contracts"

// UI
import { TablePager } from "@harness-monorepo/ui/blocks/catalog/table-pager"
import { DiscountFailed } from "@harness-monorepo/ui/blocks/promotions/discount-failed"
import { DiscountListSkeleton } from "@harness-monorepo/ui/blocks/promotions/discount-list-skeleton"
import { DiscountStatusTabs } from "@harness-monorepo/ui/blocks/promotions/discount-status-tabs"
import { PromotionForm } from "@harness-monorepo/ui/blocks/promotions/promotion-form"
import { PromotionList } from "@harness-monorepo/ui/blocks/promotions/promotion-list"
import { Button } from "@harness-monorepo/ui/components/button"
import { useFocusOnSwap } from "@harness-monorepo/ui/hooks/use-focus-on-swap"
import type { HalfTypedDates, PromotionFormIssues, PromotionFormValues } from "@harness-monorepo/ui/lib/discount-form"
import { format } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// App
import type { WebMessages } from "@/locales"
import { AppLink } from "@/components/app-link"
import { pageErrorCopy } from "@/components/design/page-error-copy"
import { emptyPromotion, promotionFormOf, promotionPayloadOf } from "@/lib/discount-form"
import { discountQueryOf, promotionRowsOf, promotionsAddressOf, promotionsHrefOf } from "@/lib/discount-view"
import { useDebouncedValue } from "@/services/addresses/use-debounced-value"
import { useProductCategories, useProducts } from "@/services/catalog/catalog-hooks"
import { usePromotions, useSavePromotion, useSetPromotionActive } from "@/services/promotions/promotion-hooks"
import { useDiscountEditor } from "./use-discount-editor"
import { useLastPage } from "./use-last-page"

export interface PromotionsScreenProps {
  slug: string
  locale: string
  messages: UiMessages
  web: WebMessages
}

const STATUSES = ["ACTIVE", "SCHEDULED", "PAUSED", "ENDED"] as const satisfies readonly PromotionStatus[]
const NO_ISSUES: PromotionFormIssues = {}
/** No row's id: every button of the list waits, none reads as the busy one. */
const SAVING = ""
const SEARCH_DEBOUNCE_MS = 300
const SEARCH_PAGE_SIZE = 20

/**
 * The shop's promotions (BEELINK-192): listed by where each stands — the status in the address —
 * created and edited in a form that opens on the screen itself, and paused or switched back on from
 * the list. Everything that knows about the network is here; the blocks are handed all they show.
 */
export function PromotionsScreen({ slug, locale, messages, web }: PromotionsScreenProps) {
  const shared = messages.discounts
  const text = shared.promotions
  const router = useRouter()
  const address = promotionsAddressOf(useSearchParams())
  const list = usePromotions(slug, discountQueryOf(address))
  const save = useSavePromotion(slug)
  const toggle = useSetPromotionActive(slug)
  const editor = useDiscountEditor<PromotionFormValues, PromotionFormIssues>(NO_ISSUES)
  const [productQuery, setProductQuery] = useState("")

  const picking = editor.editing?.value.scope === "PRODUCTS"
  const search = useDebouncedValue(productQuery.trim(), SEARCH_DEBOUNCE_MS)
  // Asked only while the form is choosing products; an empty slug is how the hook is told not to ask.
  const products = useProducts(picking ? slug : "", { ...(search ? { search } : {}), pageSize: SEARCH_PAGE_SIZE })
  const categories = useProductCategories(slug)
  const idBySlug = new Map((categories.data ?? []).map((category) => [category.slug, category.id]))

  const hrefOf = (next: Parameters<typeof promotionsHrefOf>[2]) => promotionsHrefOf(slug, address, next)
  const goTo = (href: string) => router.push(href as Parameters<typeof router.push>[0])
  useLastPage(list.data && { rows: list.data.promotions.length, total: list.data.total, page: list.data.page, pageSize: list.data.pageSize }, (page) => hrefOf({ page }))

  // The form opens above the list, which may be a screen away from the row whose button opened it:
  // the focus goes to its first field, and the page scrolls with it.
  const panel = useRef<HTMLElement>(null)
  useFocusOnSwap(editor.editing ? `form:${editor.editing.id ?? "new"}` : "closed", panel)
  const counts = list.data?.counts
  const tabs = [
    { key: "ALL", label: text.tabs.ALL, ...(counts ? { count: counts.ALL } : {}), href: hrefOf({ status: undefined }), active: address.status === undefined },
    ...STATUSES.map((status) => ({ key: status, label: text.tabs[status], ...(counts ? { count: counts[status] } : {}), href: hrefOf({ status }), active: address.status === status })),
  ]

  function openNew() {
    save.reset()
    setProductQuery("")
    editor.open(null, emptyPromotion(new Date()))
  }

  function openEdit(promotionId: string) {
    const promotion = list.data?.promotions.find((row) => row.id === promotionId)
    if (!promotion) return
    save.reset()
    setProductQuery("")
    editor.open(promotion.id, promotionFormOf(promotion))
  }

  function submit(halfTyped: HalfTypedDates) {
    if (!editor.editing) return
    const { id } = editor.editing
    const result = promotionPayloadOf(editor.editing.value, shared.issues, halfTyped)
    if ("issues" in result) return editor.refuse(result.issues)
    save.mutate(
      { id, payload: result.payload },
      {
        onSuccess: () => {
          editor.close()
          // A new one is the first row of the unfiltered list: under a status or on a later page it
          // would be saved and nowhere to be seen.
          if (id === null && (address.status !== undefined || address.page > 1)) goTo(hrefOf({ status: undefined }))
        },
      },
    )
  }

  /** A field corrected takes back what the API said of the last attempt, as it takes back the field's own issue. */
  function change(value: PromotionFormValues) {
    if (save.error) save.reset()
    editor.change(value)
  }

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-4 px-4 lg:px-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold">{text.title}</h1>
          <p className="text-muted-foreground text-sm">{text.intro}</p>
        </div>
        {editor.editing ? null : <Button onClick={openNew}>{text.create}</Button>}
      </header>

      {editor.editing ? (
        <section ref={panel} aria-label={editor.editing.id ? text.editTitle : text.create} className="rounded-xl border p-4 sm:p-6">
          <h2 className="mb-4 text-lg font-semibold">{editor.editing.id ? text.editTitle : text.create}</h2>
          <PromotionForm
            value={editor.editing.value}
            onChange={change}
            productQuery={productQuery}
            onProductQueryChange={setProductQuery}
            productResults={(products.data?.products ?? []).map((product) => ({ id: product.id, name: product.name }))}
            productsSearching={search !== productQuery.trim() || products.isFetching}
            categories={categories.data ? categories.data.map((category) => ({ id: category.id, name: category.name, parentId: category.parentSlug ? (idBySlug.get(category.parentSlug) ?? null) : null })) : null}
            onRetryCategories={categories.isError ? () => void categories.refetch() : undefined}
            issues={editor.editing.issues}
            error={pageErrorCopy(save.error, web)}
            onSubmit={submit}
            onCancel={editor.close}
            pending={save.isPending}
            messages={messages}
          />
        </section>
      ) : null}

      <DiscountStatusTabs tabs={tabs} linkComponent={AppLink} messages={messages} />

      {toggle.error ? <p role="alert" className="text-destructive text-sm">{pageErrorCopy(toggle.error, web)}</p> : null}

      <section aria-label={text.title} className="bg-card rounded-xl border">
        {list.isPending ? (
          <DiscountListSkeleton />
        ) : !list.data ? (
          <DiscountFailed onRetry={() => void list.refetch()} messages={messages} />
        ) : (
          <PromotionList
            rows={promotionRowsOf(list.data.promotions, { locale, messages })}
            empty={address.status !== undefined || address.page > 1 ? "filtered" : "none"}
            // A save on its way holds the list too: opening another row would leave its refusal unheard.
            busyId={toggle.isPending ? toggle.variables?.id : save.isPending ? SAVING : null}
            onEdit={(row) => openEdit(row.id)}
            onToggle={(row) => toggle.mutate({ id: row.id, active: !row.active })}
            messages={messages}
          />
        )}
      </section>

      {list.data && list.data.total > list.data.pageSize ? (
        <TablePager
          page={list.data.page}
          pageSize={list.data.pageSize}
          total={list.data.total}
          onPageChange={(page) => goTo(hrefOf({ page }))}
          busy={list.isFetching}
          rangeLabel={(from, to, total) => format(shared.range, { from: String(from), to: String(to), total: String(total) })}
        />
      ) : null}
    </div>
  )
}
