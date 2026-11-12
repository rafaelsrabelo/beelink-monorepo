// Locales
import { defaultLocale, defaultMessages } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import type { CommissionRateRowView } from "@harness-monorepo/ui/lib/affiliates"
import { CommissionRateRow } from "./commission-rate-row"

export interface CommissionCategoryRateListProps {
  /** Every category of the shop: a shop has few, so there is no search. */
  rows: readonly CommissionRateRowView[]
  onType: (categoryId: string, typed: string) => void
  onSave: (categoryId: string) => void
  onReset: (categoryId: string) => void
  /** What a row's field refuses, by category. */
  issues?: Readonly<Record<string, string>>
  /** A category whose rate is being written. */
  busyId?: string | null
  /** The last save, or why it was refused, in words. */
  status?: string
  locale?: string
  messages?: UiMessages
}

/**
 * A commission table's rates by category (the user's review, 12/11/2026): a category's own rate
 * reaches every product of it that has none of its own; an empty field follows the table's.
 */
export function CommissionCategoryRateList({ rows, onType, onSave, onReset, issues = {}, busyId = null, status, locale = defaultLocale, messages = defaultMessages }: CommissionCategoryRateListProps) {
  const text = messages.affiliates.table

  return (
    <section aria-labelledby="commission-category-rates-title" className="bg-shell-surface border-shell-border flex flex-col gap-3 rounded-xl border p-4 shadow-xs sm:p-6">
      <div className="flex flex-col gap-1">
        <h3 id="commission-category-rates-title" className="font-semibold">
          {text.byCategory}
        </h3>
        <p className="text-muted-foreground text-sm">{text.byCategoryHelp}</p>
      </div>

      {rows.length === 0 ? (
        <p className="text-muted-foreground py-6 text-center text-sm">{text.categoriesEmpty}</p>
      ) : (
        <ul className="divide-y">
          {rows.map((row) => (
            <CommissionRateRow
              key={row.id}
              row={row}
              onType={(typed) => onType(row.id, typed)}
              onSave={() => onSave(row.id)}
              onReset={() => onReset(row.id)}
              issue={issues[row.id]}
              busy={busyId === row.id}
              locale={locale}
              messages={messages}
            />
          ))}
        </ul>
      )}

      <p aria-live="polite" className="text-muted-foreground min-h-5 text-sm">
        {status}
      </p>
    </section>
  )
}
