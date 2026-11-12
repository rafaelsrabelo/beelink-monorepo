"use client"

// Icons
import { ChevronRightIcon, SearchIcon } from "lucide-react"

// UI
import { Badge } from "@harness-monorepo/ui/components/badge"
import { Input } from "@harness-monorepo/ui/components/input"
import { cn } from "@harness-monorepo/ui/lib/utils"

// Locales
import { defaultMessages, format } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import type { CommissionTarget, CommissionTreeCategory } from "@harness-monorepo/ui/lib/affiliate-wizard"
import { CommissionRateCell } from "./commission-rate-cell"

export interface AffiliateCommissionTreeProps {
  categories: readonly CommissionTreeCategory[]
  search: string
  onSearch: (search: string) => void
  onToggle: (categoryId: string) => void
  onCustomize: (target: CommissionTarget) => void
  onRate: (target: CommissionTarget, percent: number) => void
  onReset: (target: CommissionTarget) => void
  disabled?: boolean
  messages?: UiMessages
}

/**
 * The exceptions (the user's design, 12/11/2026): every category with its products under it, each
 * saying what it pays and where from — the base, or its category — and "Personalizar" for its own.
 * The product beats its category, which beats the base. Searching opens what it finds.
 */
export function AffiliateCommissionTree({ categories, search, onSearch, onToggle, onCustomize, onRate, onReset, disabled = false, messages = defaultMessages }: AffiliateCommissionTreeProps) {
  const text = messages.affiliates.wizard.commission
  const cell = (target: CommissionTarget, row: { name: string; own: boolean; percent: number; inheritLabel: string }) => (
    <CommissionRateCell
      name={row.name}
      own={row.own}
      percent={row.percent}
      inheritLabel={row.inheritLabel}
      onCustomize={() => onCustomize(target)}
      onRate={(percent) => onRate(target, percent)}
      onReset={() => onReset(target)}
      disabled={disabled}
      messages={messages}
    />
  )

  return (
    <section aria-label={text.exceptions} className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <h3 className="font-medium">{text.exceptions}</h3>
        <p className="text-muted-foreground text-xs">{text.exceptionsHelp}</p>
      </div>
      <label className="relative">
        <span className="sr-only">{text.search}</span>
        <SearchIcon aria-hidden="true" className="text-muted-foreground absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
        <Input type="search" placeholder={text.search} value={search} onChange={(event) => onSearch(event.target.value)} className="pl-8" />
      </label>

      {categories.length === 0 ? <p className="text-muted-foreground py-4 text-center text-sm">{text.noResults}</p> : null}
      <ul className="flex flex-col gap-2">
        {categories.map((category) => (
          <li key={category.id} className={cn("rounded-xl border", category.own ? "border-foreground/40 bg-brand-yellow/10" : "bg-background")}>
            <div className="flex flex-wrap items-center gap-3 p-3">
              <button
                type="button"
                aria-expanded={category.open}
                aria-label={format(text.expand, { name: category.name })}
                onClick={() => onToggle(category.id)}
                className="focus-visible:ring-ring hover:bg-muted grid size-7 place-items-center rounded-md focus-visible:ring-2 focus-visible:outline-none"
              >
                <ChevronRightIcon aria-hidden="true" className={cn("size-4 transition-transform motion-reduce:transition-none", category.open && "rotate-90")} />
              </button>
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="flex items-center gap-2 truncate text-sm font-medium">
                  {category.name}
                  {category.own ? <Badge variant="secondary">{text.ownTag}</Badge> : null}
                </span>
                <span className="text-muted-foreground text-xs">{category.countLabel}</span>
              </div>
              {category.customizable === false ? <span className="text-muted-foreground text-xs tabular-nums">{category.inheritLabel}</span> : cell({ kind: "category", id: category.id }, category)}
            </div>
            {category.open && category.products.length > 0 ? (
              <ul className="border-t">
                {category.products.map((product) => (
                  <li key={product.id} className={cn("flex flex-wrap items-center gap-3 py-2.5 pr-3 pl-12", product.own && "bg-brand-yellow/10")}>
                    <div className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate text-sm">{product.name}</span>
                      <span className="text-muted-foreground text-xs">{format(text.earn, { price: product.price, earn: product.earn })}</span>
                    </div>
                    {cell({ kind: "product", id: product.id }, product)}
                  </li>
                ))}
              </ul>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  )
}
