"use client"

// UI
import { Button } from "@harness-monorepo/ui/components/button"
import { centsFrom } from "@harness-monorepo/ui/lib/money"

// Locales
import { defaultMessages, format } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import type { ProductCategoryOption } from "./product-form-types"
import { ProductImportRow } from "./product-import-row"
import type { ProductImportRow as Row } from "./product-import-types"

export interface ProductImportReviewProps {
  rows: readonly Row[]
  categories: readonly ProductCategoryOption[]
  onChange: (rows: Row[]) => void
  onSubmit: () => void
  onRestart: () => void
  pending?: boolean
  /** The import's refusal, as a sentence the screen already wrote. */
  error?: string
  messages?: UiMessages
}

/** Whether these rows can be imported, and if not, why — the same answer the button and the line give. */
export function blockerOf(rows: readonly Row[], text: UiMessages["catalog"]["products"]["import"]): string | null {
  const ticked = rows.filter((row) => row.include)
  if (ticked.length === 0) return text.nothingSelected
  if (ticked.some((row) => centsFrom(row.price) === null)) return text.missingPrices
  return null
}

/**
 * What the reader found, for the shopkeeper to correct before anything is created. Every row is
 * a draft: nothing here is on the shop window until it gets a photo and is published.
 */
export function ProductImportReview({
  rows,
  categories,
  onChange,
  onSubmit,
  onRestart,
  pending = false,
  error,
  messages = defaultMessages,
}: ProductImportReviewProps) {
  const text = messages.catalog.products.import
  const ticked = rows.filter((row) => row.include).length
  const blocker = blockerOf(rows, text)

  return (
    <section className="flex flex-col gap-4" aria-labelledby="product-import-review-title">
      <header className="flex flex-col gap-1">
        <h2 id="product-import-review-title" className="text-lg font-semibold">
          {text.reviewTitle}
        </h2>
        <p className="text-muted-foreground text-sm">{text.reviewHint}</p>
      </header>

      <div className="rounded-xl border px-4">
        <div
          aria-hidden
          className="text-muted-foreground hidden gap-3 border-b py-2 text-xs font-medium sm:grid sm:grid-cols-[auto_1fr_8rem_14rem]"
        >
          <span className="w-4" />
          <span>{text.nameHeader}</span>
          <span>{text.priceHeader}</span>
          <span>{text.categoryHeader}</span>
        </div>
        <ul className="divide-y">
          {rows.map((row, index) => (
            <ProductImportRow
              key={row.key}
              row={row}
              categories={categories}
              disabled={pending}
              messages={messages}
              onChange={(next) => onChange(rows.map((current, at) => (at === index ? next : current)))}
            />
          ))}
        </ul>
      </div>

      <footer className="bg-shell-content sticky bottom-0 z-20 flex flex-wrap items-center justify-end gap-2 border-t py-3">
        <div className="mr-auto min-w-0 basis-full text-sm sm:basis-0 sm:flex-1" aria-live="polite">
          {error ? (
            <p role="alert" className="text-destructive">
              {error}
            </p>
          ) : (
            <p className="text-muted-foreground">
              {blocker ?? format(text.selected, { count: String(ticked), total: String(rows.length) })}
            </p>
          )}
        </div>
        <Button type="button" variant="outline" disabled={pending} onClick={onRestart}>
          {text.again}
        </Button>
        <Button type="button" disabled={pending || blocker !== null} onClick={onSubmit}>
          {pending ? text.submitting : format(text.submit, { count: String(ticked) })}
        </Button>
      </footer>
    </section>
  )
}
