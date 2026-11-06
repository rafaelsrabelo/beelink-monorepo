"use client"

// UI
import { Checkbox } from "@harness-monorepo/ui/components/checkbox"
import { Input } from "@harness-monorepo/ui/components/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@harness-monorepo/ui/components/select"
import { centsFrom, reaisFrom } from "@harness-monorepo/ui/lib/money"
import { cn } from "@harness-monorepo/ui/lib/utils"

// Locales
import { defaultMessages, format } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import type { ProductCategoryOption } from "./product-form-types"
import { NEW_CATEGORY, type ProductImportRow as Row } from "./product-import-types"

/** The select's value for no category: an empty string is not a value the primitive can hold. */
const NONE = "none"

export interface ProductImportRowProps {
  row: Row
  categories: readonly ProductCategoryOption[]
  onChange: (row: Row) => void
  disabled?: boolean
  messages?: UiMessages
}

/** "Morango, Nutella R$ 6,50" — a value priced apart says its price; the rest sell at the product's. */
function valuesOf(option: NonNullable<Row["option"]>): string {
  return option.values
    .map((value) => (value.priceCents === null ? value.name : `${value.name} R$ ${reaisFrom(value.priceCents)}`))
    .join(", ")
}

/**
 * One product of the review. An unticked row stays editable, dimmed: ticking it back is one click,
 * and what was corrected in it is not lost.
 */
export function ProductImportRow({ row, categories, onChange, disabled = false, messages = defaultMessages }: ProductImportRowProps) {
  const text = messages.catalog.products.import
  const label = row.name.trim() || text.nameHeader
  const priceMissing = row.include && centsFrom(row.price) === null
  const priceErrorId = `${row.key}-price-error`

  function set(patch: Partial<Row>) {
    onChange({ ...row, ...patch })
  }

  function categoryLabel(value: string): string {
    if (value === NEW_CATEGORY && row.newCategoryName) return format(text.categoryNew, { name: row.newCategoryName })
    return categories.find((category) => category.id === value)?.name ?? text.categoryNone
  }

  return (
    <li className={cn("grid gap-3 py-4 sm:grid-cols-[auto_1fr_8rem_14rem] sm:items-start", !row.include && "opacity-60")}>
      <Checkbox
        className="mt-2.5"
        checked={row.include}
        disabled={disabled}
        aria-label={format(text.includeFor, { name: label })}
        onCheckedChange={(checked) => set({ include: checked })}
      />

      <div className="flex min-w-0 flex-col gap-1">
        <Input
          value={row.name}
          disabled={disabled}
          aria-label={format(text.nameFor, { name: label })}
          onChange={(event) => set({ name: event.target.value })}
        />
        {row.description ? <p className="text-muted-foreground line-clamp-2 text-xs">{row.description}</p> : null}
        {row.option ? (
          <p className="text-muted-foreground text-xs">
            {format(text.variations, { option: row.option.name, values: valuesOf(row.option) })}
          </p>
        ) : null}
      </div>

      <div className="flex flex-col gap-1">
        <Input
          inputMode="decimal"
          autoComplete="off"
          value={row.price}
          disabled={disabled}
          aria-label={format(text.priceFor, { name: label })}
          aria-invalid={priceMissing ? true : undefined}
          aria-describedby={priceMissing ? priceErrorId : undefined}
          onChange={(event) => set({ price: event.target.value })}
        />
        {priceMissing ? (
          <p id={priceErrorId} className="text-destructive text-xs">
            {text.priceMissing}
          </p>
        ) : null}
      </div>

      <Select
        value={row.categoryId === "" ? NONE : row.categoryId}
        disabled={disabled}
        onValueChange={(next: string | null) => set({ categoryId: !next || next === NONE ? "" : next })}
      >
        <SelectTrigger className="w-full" aria-label={format(text.categoryFor, { name: label })}>
          <SelectValue>{(selected: string) => categoryLabel(selected)}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={NONE}>{text.categoryNone}</SelectItem>
          {row.newCategoryName ? (
            <SelectItem value={NEW_CATEGORY}>{format(text.categoryNew, { name: row.newCategoryName })}</SelectItem>
          ) : null}
          {categories.map((category) => (
            <SelectItem key={category.id} value={category.id}>
              {category.parentName ? `${category.parentName} › ${category.name}` : category.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </li>
  )
}
