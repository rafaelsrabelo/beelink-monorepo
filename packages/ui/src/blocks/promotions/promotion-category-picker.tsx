"use client"

// UI
import { Checkbox } from "@harness-monorepo/ui/components/checkbox"
import { FieldDescription, FieldError, FieldLegend, FieldSet } from "@harness-monorepo/ui/components/field"
import { Label } from "@harness-monorepo/ui/components/label"

// Utils
import { cn } from "@harness-monorepo/ui/lib/utils"

// Locales
import { defaultMessages } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

export interface PromotionCategoryOption {
  id: string
  name: string
  /** The category it sits under; null is a top level. */
  parentId: string | null
}

export interface PromotionCategoryPickerProps {
  categories: readonly PromotionCategoryOption[]
  chosenIds: readonly string[]
  onChange: (chosenIds: string[]) => void
  issue?: string
  disabled?: boolean
  messages?: UiMessages
}

/**
 * The categories a promotion names, as the shop's own tree: each top level with its subcategories
 * under it. Choosing a category already covers what sits under it, which the help line says — so
 * nobody ticks every subcategory to be safe.
 */
export function PromotionCategoryPicker({ categories, chosenIds, onChange, issue, disabled = false, messages = defaultMessages }: PromotionCategoryPickerProps) {
  const text = messages.discounts.promotions
  const chosen = new Set(chosenIds)
  const known = new Set(categories.map((category) => category.id))
  // A subcategory whose parent is not in the list is drawn at the top rather than not at all.
  const tops = categories.filter((category) => !category.parentId || !known.has(category.parentId))
  const ordered = tops.flatMap((top) => [{ ...top, nested: false }, ...categories.filter((category) => category.parentId === top.id).map((child) => ({ ...child, nested: true }))])

  const toggle = (id: string, checked: boolean) => onChange(checked ? [...chosenIds, id] : chosenIds.filter((other) => other !== id))

  return (
    <FieldSet className="flex flex-col gap-3">
      <FieldLegend variant="label">{text.categoriesLabel}</FieldLegend>
      <FieldDescription>{text.categoriesHelp}</FieldDescription>
      {ordered.length === 0 ? (
        <p className="text-muted-foreground text-sm">{text.categoriesEmpty}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {ordered.map((category) => (
            <li key={category.id} className={cn("flex items-center gap-2", category.nested && "pl-6")}>
              <Checkbox
                id={`promotion-category-${category.id}`}
                checked={chosen.has(category.id)}
                disabled={disabled}
                onCheckedChange={(next: boolean | "indeterminate") => toggle(category.id, next === true)}
              />
              <Label htmlFor={`promotion-category-${category.id}`} className="font-normal">
                {category.name}
              </Label>
            </li>
          ))}
        </ul>
      )}
      <FieldError>{issue}</FieldError>
    </FieldSet>
  )
}
