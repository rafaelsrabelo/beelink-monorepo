// Libs
import { PencilIcon, PlusIcon, Trash2Icon } from "lucide-react"

// UI
import { Badge } from "@harness-monorepo/ui/components/badge"
import { Button, buttonVariants } from "@harness-monorepo/ui/components/button"
import { ratePercentOf } from "@harness-monorepo/ui/lib/cashback"

// Locales
import { defaultLocale, defaultMessages, format } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import type { CommissionTableView } from "@harness-monorepo/ui/lib/affiliates"
import { AnchorLink, type LinkComponent } from "../auth/auth-link"

export interface CommissionTableListProps {
  /** The default table first, as the API lists them. */
  tables: readonly CommissionTableView[]
  /** Where a table's rates by product are edited. */
  hrefOf: (tableId: string) => string
  onCreate: () => void
  onEdit: (table: CommissionTableView) => void
  onDelete: (table: CommissionTableView) => void
  /** A table being written: its buttons wait. */
  busyId?: string | null
  locale?: string
  linkComponent?: LinkComponent
  messages?: UiMessages
}

/**
 * The shop's commission tables (IMPULSEIA-102): each with the rate every product pays on it and how
 * many products pay their own. The default one is marked and has no delete — every affiliate needs a
 * table to fall back on.
 */
export function CommissionTableList({ tables, hrefOf, onCreate, onEdit, onDelete, busyId = null, locale = defaultLocale, linkComponent: Link = AnchorLink, messages = defaultMessages }: CommissionTableListProps) {
  const text = messages.affiliates.tables

  return (
    <section aria-labelledby="commission-tables-title" className="bg-shell-surface border-shell-border flex flex-col gap-4 rounded-xl border p-4 shadow-xs sm:p-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h2 id="commission-tables-title" className="font-semibold">
            {text.title}
          </h2>
          <p className="text-muted-foreground text-sm">{text.intro}</p>
        </div>
        <Button type="button" onClick={onCreate}>
          <PlusIcon />
          {text.create}
        </Button>
      </header>

      <ul className="divide-y">
        {tables.map((table) => (
          <li key={table.id} className="flex flex-wrap items-center gap-3 py-3">
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <p className="flex items-center gap-2 font-medium">
                <span className="truncate">{table.name}</span>
                {table.isDefault ? <Badge variant="secondary">{text.defaultBadge}</Badge> : null}
              </p>
              <p className="text-muted-foreground text-sm">
                {format(text.rate, { rate: ratePercentOf(table.defaultRateBps, locale) })} ·{" "}
                {table.productRateCount > 0 ? format(text.productRates, { count: String(table.productRateCount) }) : text.productRatesNone} ·{" "}
                {table.affiliateCount === 0 ? text.affiliatesNone : table.affiliateCount === 1 ? text.affiliatesOne : format(text.affiliates, { count: String(table.affiliateCount) })}
              </p>
            </div>
            <div className="flex items-center gap-1">
              <Link href={hrefOf(table.id)} aria-label={format(text.open, { name: table.name })} className={buttonVariants({ variant: "outline", size: "sm" })}>
                {text.openLabel}
              </Link>
              <Button type="button" variant="ghost" size="icon" aria-label={format(text.edit, { name: table.name })} onClick={() => onEdit(table)} disabled={busyId === table.id}>
                <PencilIcon />
              </Button>
              {table.isDefault ? null : (
                <Button type="button" variant="ghost" size="icon" aria-label={format(text.delete, { name: table.name })} onClick={() => onDelete(table)} disabled={busyId === table.id}>
                  <Trash2Icon />
                </Button>
              )}
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}
