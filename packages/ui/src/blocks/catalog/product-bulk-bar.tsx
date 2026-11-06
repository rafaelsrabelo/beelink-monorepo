"use client"

// UI
import { Button } from "@harness-monorepo/ui/components/button"

// Locales
import { defaultMessages, format } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

export interface ProductBulkBarProps {
  /** How many products are chosen, on this page and others. The bar is drawn only above zero. */
  count: number
  onActivate: () => void
  onDraft: () => void
  onClear: () => void
  /** Which of the two is on its way, so its button says so and both wait. */
  pending?: "ACTIVE" | "DRAFT" | null
  /** The refusal, as a sentence the screen already wrote. */
  error?: string
  messages?: UiMessages
}

/**
 * What to do with the products chosen in the list: put them on sale, or back to draft, at once.
 * Sticky at the foot of the screen, as the order screen's footer is, so it stays in reach while
 * the shopkeeper scrolls a long page choosing.
 */
export function ProductBulkBar({
  count,
  onActivate,
  onDraft,
  onClear,
  pending = null,
  error,
  messages = defaultMessages,
}: ProductBulkBarProps) {
  const text = messages.catalog.products.bulk
  if (count === 0) return null

  const busy = pending !== null

  return (
    <div className="bg-shell-content sticky bottom-0 z-20 flex flex-wrap items-center justify-end gap-2 border-t py-3">
      <div className="mr-auto flex min-w-0 basis-full flex-col text-sm sm:basis-0 sm:flex-1" aria-live="polite">
        <p className="font-medium">{count === 1 ? text.selectedOne : format(text.selectedMany, { count: String(count) })}</p>
        {error ? (
          <p role="alert" className="text-destructive">
            {error}
          </p>
        ) : (
          <p className="text-muted-foreground">{text.hint}</p>
        )}
      </div>
      <Button type="button" variant="ghost" disabled={busy} onClick={onClear}>
        {text.clear}
      </Button>
      <Button type="button" variant="outline" disabled={busy} onClick={onDraft}>
        {pending === "DRAFT" ? text.saving : text.draft}
      </Button>
      <Button type="button" disabled={busy} onClick={onActivate}>
        {pending === "ACTIVE" ? text.saving : text.activate}
      </Button>
    </div>
  )
}
