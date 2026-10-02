"use client"

// React
import { useState } from "react"

// Next
import { useRouter, useSearchParams } from "next/navigation"

// UI
import { DiscountFormSkeleton } from "@harness-monorepo/ui/blocks/promotions/discount-form-skeleton"
import { PromotionForm } from "@harness-monorepo/ui/blocks/promotions/promotion-form"
import type { HalfTypedDates, PromotionFormIssues, PromotionFormValues } from "@harness-monorepo/ui/lib/discount-form"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// App
import type { WebMessages } from "@/locales"
import { pageErrorCopy } from "@/components/design/page-error-copy"
import { emptyPromotion, promotionFormOf, promotionPayloadOf } from "@/lib/discount-form"
import { promotionsAddressOf, promotionsHrefOf } from "@/lib/discount-view"
import { useDebouncedValue } from "@/services/addresses/use-debounced-value"
import { useProductCategories, useProducts } from "@/services/catalog/catalog-hooks"
import { usePromotion, useSavePromotion } from "@/services/promotions/promotion-hooks"
import { DiscountEditorFrame } from "./discount-editor-frame"
import { useDiscountEditor } from "./use-discount-editor"

export interface PromotionEditorScreenProps {
  slug: string
  /** Absent means a promotion that does not exist yet. */
  promotionId?: string
  messages: UiMessages
  web: WebMessages
}

const NO_ISSUES: PromotionFormIssues = {}
const SEARCH_DEBOUNCE_MS = 300
const SEARCH_PAGE_SIZE = 20

/**
 * One promotion, on a page of its own: read, saved, and then back to the list it was opened from.
 * A page and not a panel above the list, so making one is never mixed up with reading the others.
 */
export function PromotionEditorScreen({ slug, promotionId, messages, web }: PromotionEditorScreenProps) {
  const shared = messages.discounts
  const text = shared.promotions
  const router = useRouter()
  const address = promotionsAddressOf(useSearchParams())
  const list = promotionsHrefOf(slug, address, { page: address.page })
  const existing = usePromotion(slug, promotionId ?? "")
  const save = useSavePromotion(slug)
  const editor = useDiscountEditor<PromotionFormValues, PromotionFormIssues>(NO_ISSUES)
  const [productQuery, setProductQuery] = useState("")

  // Seeded during render, once, and not in an effect: an effect would paint an empty form first, and
  // a refetch of the same promotion would write over what is being typed.
  if (editor.editing === null) {
    if (!promotionId) editor.open(null, emptyPromotion(new Date()))
    else if (existing.data) editor.open(existing.data.id, promotionFormOf(existing.data))
  }

  const picking = editor.editing?.value.scope === "PRODUCTS"
  const search = useDebouncedValue(productQuery.trim(), SEARCH_DEBOUNCE_MS)
  // Asked only while the form is choosing products; an empty slug is how the hook is told not to ask.
  const products = useProducts(picking ? slug : "", { ...(search ? { search } : {}), pageSize: SEARCH_PAGE_SIZE })
  const categories = useProductCategories(slug)
  const idBySlug = new Map((categories.data ?? []).map((category) => [category.slug, category.id]))
  const goToList = () => router.push(list as Parameters<typeof router.push>[0])

  function submit(halfTyped: HalfTypedDates) {
    if (!editor.editing) return
    const result = promotionPayloadOf(editor.editing.value, shared.issues, halfTyped)
    if ("issues" in result) return editor.refuse(result.issues)
    save.mutate({ id: editor.editing.id, payload: result.payload }, { onSuccess: goToList })
  }

  /** A field corrected takes back what the API said of the last attempt, as it takes back the field's own issue. */
  function change(value: PromotionFormValues) {
    if (save.error) save.reset()
    editor.change(value)
  }

  return (
    <DiscountEditorFrame
      title={promotionId ? text.editTitle : text.create}
      backHref={list}
      backLabel={text.title}
      failure={existing.isError ? pageErrorCopy(existing.error, web) : undefined}
      onRetry={() => void existing.refetch()}
      retryLabel={shared.retry}
    >
      {editor.editing ? (
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
          onCancel={goToList}
          // Still held once saved: the list is on its way, and a second click would make a second one.
          pending={save.isPending || save.isSuccess}
          messages={messages}
        />
      ) : (
        <DiscountFormSkeleton />
      )}
    </DiscountEditorFrame>
  )
}
