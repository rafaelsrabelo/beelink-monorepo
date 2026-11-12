// Libs
import { SearchIcon } from "lucide-react"

// UI
import { InputGroup, InputGroupAddon, InputGroupInput } from "@harness-monorepo/ui/components/input-group"

// Locales
import { defaultLocale, defaultMessages } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import type { CommissionRateRowView } from "@harness-monorepo/ui/lib/affiliates"
import { CommissionRateRow } from "./commission-rate-row"

export interface CommissionRateListProps {
  /** The page of products on screen. */
  rows: readonly CommissionRateRowView[]
  defaultRateBps: number
  search: string
  onSearch: (search: string) => void
  onType: (productId: string, typed: string) => void
  onSave: (productId: string) => void
  onReset: (productId: string) => void
  /** What a row's field refuses, by product. */
  issues?: Readonly<Record<string, string>>
  /** A product whose rate is being written. */
  busyId?: string | null
  /** The last save, or why it was refused, in words. */
  status?: string
  /** Said with no rows: the shop has none, or none matches the search. */
  emptyText: string
  locale?: string
  messages?: UiMessages
}

/**
 * A commission table's rates, product by product (IMPULSEIA-102): each product's own rate here, or
 * the table's, which an empty field follows. A row is saved on its own, so a long catalogue is
 * edited a few products at a time.
 */
export function CommissionRateList({ rows, defaultRateBps, search, onSearch, onType, onSave, onReset, issues = {}, busyId = null, status, emptyText, locale = defaultLocale, messages = defaultMessages }: CommissionRateListProps) {
  const text = messages.affiliates.table

  return (
    <section aria-label={text.rate} className="bg-shell-surface border-shell-border flex flex-col gap-3 rounded-xl border p-4 shadow-xs sm:p-6">
      <InputGroup className="max-w-sm">
        <InputGroupAddon>
          <SearchIcon />
        </InputGroupAddon>
        <InputGroupInput type="search" aria-label={text.search} placeholder={text.search} value={search} onChange={(event) => onSearch(event.target.value)} />
      </InputGroup>

      {rows.length === 0 ? (
        <p className="text-muted-foreground py-8 text-center text-sm">{emptyText}</p>
      ) : (
        <ul className="divide-y">
          {rows.map((row) => (
            <CommissionRateRow
              key={row.productId}
              row={row}
              defaultRateBps={defaultRateBps}
              onType={(typed) => onType(row.productId, typed)}
              onSave={() => onSave(row.productId)}
              onReset={() => onReset(row.productId)}
              issue={issues[row.productId]}
              busy={busyId === row.productId}
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
