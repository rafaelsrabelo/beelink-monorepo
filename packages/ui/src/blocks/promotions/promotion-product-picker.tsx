"use client"

// Libs
import { PlusIcon, XIcon } from "lucide-react"

// UI
import { Button } from "@harness-monorepo/ui/components/button"
import { FieldError, FieldLegend, FieldSet } from "@harness-monorepo/ui/components/field"
import { Input } from "@harness-monorepo/ui/components/input"
import { Skeleton } from "@harness-monorepo/ui/components/skeleton"

// Locales
import { defaultMessages, format } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import { PROMOTION_TARGETS_MAX, type DiscountTargetOption } from "@harness-monorepo/ui/lib/discount-form"

export interface PromotionProductPickerProps {
  query: string
  onQueryChange: (query: string) => void
  /** The catalogue's answer for the query — its first page when nothing is typed. */
  results: readonly DiscountTargetOption[]
  searching?: boolean
  chosen: readonly DiscountTargetOption[]
  onChange: (chosen: DiscountTargetOption[]) => void
  issue?: string
  disabled?: boolean
  messages?: UiMessages
}

/**
 * The products a promotion names: found by searching the catalogue, chosen one by one, and listed
 * with the way to take each back out. One already chosen leaves the results, so nothing is named twice.
 */
export function PromotionProductPicker({ query, onQueryChange, results, searching = false, chosen, onChange, issue, disabled = false, messages = defaultMessages }: PromotionProductPickerProps) {
  const text = messages.discounts.promotions
  const chosenIds = new Set(chosen.map((product) => product.id))
  const offered = results.filter((product) => !chosenIds.has(product.id))
  const full = chosen.length >= PROMOTION_TARGETS_MAX

  return (
    <FieldSet className="flex flex-col gap-3">
      <FieldLegend variant="label">{text.productsLabel}</FieldLegend>
      <Input
        type="search"
        enterKeyHint="search"
        aria-label={text.productSearchLabel}
        placeholder={text.productSearchPlaceholder}
        value={query}
        disabled={disabled}
        onChange={(event) => onQueryChange(event.target.value)}
        // It sits in the promotion's form: Enter here searches, it never saves the promotion.
        onKeyDown={(event) => {
          if (event.key === "Enter") event.preventDefault()
        }}
      />
      {searching && offered.length === 0 ? (
        <div className="flex flex-col gap-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : offered.length === 0 ? (
        <p className="text-muted-foreground text-sm">{text.productNone}</p>
      ) : (
        <ul aria-label={text.productSearchLabel} className="divide-border flex max-h-56 flex-col divide-y overflow-y-auto rounded-lg border">
          {offered.map((product) => (
            <li key={product.id} className="flex items-center justify-between gap-3 px-3 py-1.5">
              <span className="min-w-0 truncate text-sm">{product.name}</span>
              <Button type="button" variant="outline" size="icon" disabled={disabled || full} aria-label={format(text.productAdd, { name: product.name })} onClick={() => onChange([...chosen, product])}>
                <PlusIcon />
              </Button>
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-col gap-2">
        <p className="text-sm font-medium">{text.productsChosen}</p>
        {chosen.length === 0 ? (
          <p className="text-muted-foreground text-sm">{text.productsEmpty}</p>
        ) : (
          <ul aria-label={text.productsChosen} className="flex flex-wrap gap-1.5">
            {chosen.map((product) => (
              <li key={product.id} className="bg-muted inline-flex min-h-9 items-center gap-1 rounded-full py-0.5 pr-1 pl-3 text-sm">
                <span className="max-w-56 truncate">{product.name}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-7 rounded-full"
                  disabled={disabled}
                  aria-label={format(text.productRemove, { name: product.name })}
                  onClick={() => onChange(chosen.filter((other) => other.id !== product.id))}
                >
                  <XIcon />
                </Button>
              </li>
            ))}
          </ul>
        )}
        <FieldError>{issue}</FieldError>
      </div>
    </FieldSet>
  )
}
