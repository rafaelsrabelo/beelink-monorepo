"use client"

// UI
import { Field, FieldContent, FieldDescription, FieldError, FieldLabel } from "@harness-monorepo/ui/components/field"
import { Input } from "@harness-monorepo/ui/components/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@harness-monorepo/ui/components/select"
import { Switch } from "@harness-monorepo/ui/components/switch"

// Locales
import { defaultMessages } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import type { ProductCategoryOption, ProductFormIssues, ProductFormValues } from "./product-form-types"

export interface ProductKitFieldsProps {
  value: ProductFormValues
  onChange: (value: ProductFormValues) => void
  categories: readonly ProductCategoryOption[]
  errors?: ProductFormIssues
  disabled?: boolean
  messages?: UiMessages
}

/**
 * "Este produto é um kit" (plan 2026-11-10--kits-monte-seu-kit): switched on, how many items the
 * customer picks and the category they come from. A kit keeps no stock of its own, so switching it on
 * switches the product's count off; the price stays the product's, as the pricing section sets it.
 */
export function ProductKitFields({ value, onChange, categories, errors, disabled = false, messages = defaultMessages }: ProductKitFieldsProps) {
  const text = messages.catalog.kit
  const nameOf = (id: string) => {
    const category = categories.find((each) => each.id === id)
    return category ? (category.parentName ? `${category.parentName} › ${category.name}` : category.name) : text.categoryNone
  }

  return (
    <div className="flex flex-col gap-4 rounded-lg border p-4">
      <Field orientation="horizontal">
        <FieldContent>
          <FieldLabel htmlFor="product-kit">{text.toggle}</FieldLabel>
          <FieldDescription id="product-kit-help">{text.toggleHint}</FieldDescription>
        </FieldContent>
        <Switch
          id="product-kit"
          checked={value.isKit}
          disabled={disabled}
          aria-describedby="product-kit-help"
          onCheckedChange={(on: boolean) => onChange({ ...value, isKit: on, ...(on ? { trackStock: false } : {}) })}
        />
      </Field>

      {value.isKit ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field data-invalid={errors?.kitSize ? true : undefined}>
            <FieldLabel htmlFor="product-kit-size">{text.size}</FieldLabel>
            <Input
              id="product-kit-size"
              inputMode="numeric"
              autoComplete="off"
              placeholder="20"
              value={value.kitSize}
              disabled={disabled}
              aria-invalid={errors?.kitSize ? true : undefined}
              aria-describedby="product-kit-size-help"
              onChange={(event) => onChange({ ...value, kitSize: event.target.value.replace(/\D/g, "").slice(0, 2) })}
            />
            <FieldDescription id="product-kit-size-help">{text.sizeHint}</FieldDescription>
            {errors?.kitSize ? <FieldError>{errors.kitSize.message}</FieldError> : null}
          </Field>

          <Field data-invalid={errors?.kitCategoryId ? true : undefined}>
            <FieldLabel htmlFor="product-kit-category">{text.category}</FieldLabel>
            <Select
              disabled={disabled}
              value={value.kitCategoryId === "" ? "none" : value.kitCategoryId}
              onValueChange={(next: string | null) => onChange({ ...value, kitCategoryId: !next || next === "none" ? "" : next })}
            >
              <SelectTrigger id="product-kit-category" aria-invalid={errors?.kitCategoryId ? true : undefined} aria-describedby="product-kit-category-help">
                {/* A render function: Base UI shows the raw value unless it is told how to read it. */}
                <SelectValue>{(selected: string) => (selected === "none" || !selected ? text.categoryNone : nameOf(selected))}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">{text.categoryNone}</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.parentName ? `${category.parentName} › ${category.name}` : category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FieldDescription id="product-kit-category-help">{text.categoryHint}</FieldDescription>
            {errors?.kitCategoryId ? <FieldError>{errors.kitCategoryId.message}</FieldError> : null}
          </Field>
        </div>
      ) : null}
    </div>
  )
}
