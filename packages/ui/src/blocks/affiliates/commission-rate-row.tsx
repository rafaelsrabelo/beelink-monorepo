// Libs
import { ImageIcon } from "lucide-react"

// UI
import { Button } from "@harness-monorepo/ui/components/button"
import { Input } from "@harness-monorepo/ui/components/input"
import { ratePercentOf } from "@harness-monorepo/ui/lib/cashback"

// Locales
import { defaultLocale, defaultMessages, format } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import type { CommissionRateRowView } from "@harness-monorepo/ui/lib/affiliates"

export interface CommissionRateRowProps {
  row: CommissionRateRowView
  onType: (typed: string) => void
  onSave: () => void
  onReset: () => void
  issue?: string
  busy?: boolean
  locale?: string
  messages?: UiMessages
}

/** One product's or one category's commission on a table: its own rate, typed and saved here, or what it follows. */
export function CommissionRateRow({ row, onType, onSave, onReset, issue, busy = false, locale = defaultLocale, messages = defaultMessages }: CommissionRateRowProps) {
  const text = messages.affiliates.table
  const fieldId = `commission-rate-${row.id}`
  const fallback = ratePercentOf(row.fallbackRateBps, locale)

  return (
    <li className="flex flex-wrap items-start gap-3 py-3">
      <div className="flex min-w-48 flex-1 items-center gap-3">
        {row.imageUrl === undefined ? null : row.imageUrl ? (
          <img src={row.imageUrl} alt="" className="size-10 shrink-0 rounded-md object-cover" />
        ) : (
          <span className="bg-muted text-muted-foreground flex size-10 shrink-0 items-center justify-center rounded-md">
            <ImageIcon className="size-4" />
          </span>
        )}
        <label htmlFor={fieldId} className="truncate font-medium">
          {row.name}
        </label>
      </div>
      <div className="flex flex-col gap-1">
        <form
          noValidate
          className="flex items-center gap-2"
          onSubmit={(event) => {
            event.preventDefault()
            onSave()
          }}
        >
          <Input
            id={fieldId}
            inputMode="decimal"
            autoComplete="off"
            className="w-24"
            placeholder={String(row.fallbackRateBps / 100).replace(".", ",")}
            value={row.typed}
            disabled={busy}
            aria-invalid={issue ? true : undefined}
            aria-describedby={`${fieldId}-note`}
            onChange={(event) => onType(event.target.value)}
          />
          <span className="text-muted-foreground text-sm">%</span>
          <Button type="submit" size="sm" disabled={busy || !row.changed} aria-label={format(text.save, { name: row.name })}>
            {text.saveLabel}
          </Button>
          {row.rateBps !== null ? (
            <Button type="button" variant="ghost" size="sm" disabled={busy} onClick={onReset} aria-label={format(text.reset, { name: row.name })}>
              {text.resetLabel}
            </Button>
          ) : null}
        </form>
        {/* Always there, so a row keeps its height when its note comes and goes. */}
        <p id={`${fieldId}-note`} className={issue ? "text-destructive min-h-4 text-xs" : "text-muted-foreground min-h-4 text-xs"}>
          {issue ?? (row.rateBps !== null ? null : row.fallbackName !== null ? format(text.followsCategory, { name: row.fallbackName, rate: fallback }) : format(text.follows, { rate: fallback }))}
        </p>
      </div>
    </li>
  )
}
