"use client"

// React
import { useState } from "react"

// Next
import { useRouter } from "next/navigation"

// UI
import { ProductImportPicker } from "@harness-monorepo/ui/blocks/catalog/product-import-picker"
import { ProductImportReview, type ProductImportRow } from "@harness-monorepo/ui/blocks/catalog/product-import-review"
import { ProductImportReviewSkeleton } from "@harness-monorepo/ui/blocks/catalog/product-import-review-skeleton"
import { buttonVariants } from "@harness-monorepo/ui/components/button"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Types
import type { WebMessages } from "@/locales"

// App
import { AppLink } from "@/components/app-link"
import { storeErrorCopy } from "@/components/store/store-error-copy"
import { useProductCategories } from "@/services/catalog/catalog-hooks"
import { useExtractProducts, useImportProducts } from "@/services/catalog/product-import-hooks"
import { payloadFrom, rowsFrom } from "./product-import-mapping"

export interface ProductImportScreenProps {
  slug: string
  ui: UiMessages
  web: WebMessages
}

/**
 * A shop's menu read into products: choose the file, wait for the read, correct what it found,
 * import. Three states in one place with one address — the review is not a page of its own,
 * because a reload there would have to read the menu again, and every read is billed.
 *
 * The rows are the form's fields, held here; the drafts they start from are the read's answer.
 * Once imported, the list opens on its drafts, which is where the photos are added next.
 */
export function ProductImportScreen({ slug, ui, web }: ProductImportScreenProps) {
  const router = useRouter()
  const text = ui.catalog.products.import
  const categories = useProductCategories(slug)
  const read = useExtractProducts(slug)
  const save = useImportProducts(slug)
  const [rows, setRows] = useState<ProductImportRow[] | null>(null)

  function pick(file: File) {
    read.mutate(file, {
      // Categories not loaded yet only cost a "Nova:" the import then resolves to the shop's own.
      onSuccess: (answer) => setRows(rowsFrom(answer.drafts, categories.data ?? [])),
    })
  }

  function restart() {
    setRows(null)
    read.reset()
    save.reset()
  }

  function submit() {
    const payload = rows ? payloadFrom(rows) : null
    if (!payload) return

    save.mutate(payload, {
      onSuccess: () => router.push(`/admin/${slug}/products?status=DRAFT` as Parameters<typeof router.push>[0]),
    })
  }

  return (
    <div className="flex w-full flex-col gap-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold">{text.title}</h1>
          <p className="text-muted-foreground text-sm">{text.description}</p>
        </div>
        <AppLink href={`/admin/${slug}/products`} className={buttonVariants({ variant: "outline" })}>
          {text.back}
        </AppLink>
      </header>

      {rows ? (
        <ProductImportReview
          rows={rows}
          categories={(categories.data ?? []).map((category) => ({ id: category.id, name: category.name }))}
          onChange={setRows}
          onSubmit={submit}
          onRestart={restart}
          pending={save.isPending}
          error={storeErrorCopy(save.error, web)}
          messages={ui}
        />
      ) : read.isPending ? (
        <ProductImportReviewSkeleton messages={ui} />
      ) : (
        <ProductImportPicker onPick={pick} error={storeErrorCopy(read.error, web)} messages={ui} />
      )}
    </div>
  )
}
