"use client"

// React
import { useId } from "react"

// UI
import { Checkbox } from "@harness-monorepo/ui/components/checkbox"
import { Field, FieldContent, FieldDescription, FieldError, FieldLabel, FieldLegend, FieldSet } from "@harness-monorepo/ui/components/field"
import { Input } from "@harness-monorepo/ui/components/input"
import { RadioGroup, RadioGroupItem } from "@harness-monorepo/ui/components/radio-group"
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

const SCOPES = ["ALL", "ONLY", "EXCEPT"] as const satisfies readonly ProductFormValues["kitScope"][]

/**
 * "Este produto é um kit" (plan 2026-11-10--kits-monte-seu-kit): switched on, how many items the
 * customer picks and which products may go in — every one of the shop, only some categories', or
 * every one but some categories'. A kit keeps no stock of its own, so switching it on switches the
 * product's count off; the price stays the product's, as the pricing section sets it.
 */
export function ProductKitFields({ value, onChange, categories, errors, disabled = false, messages = defaultMessages }: ProductKitFieldsProps) {
  const text = messages.catalog.kit
  const id = useId()
  const scopeLabel = { ALL: text.scopeAll, ONLY: text.scopeOnly, EXCEPT: text.scopeExcept }
  const ticked = new Set(value.kitCategoryIds)
  const tick = (categoryId: string, on: boolean) =>
    onChange({ ...value, kitCategoryIds: on ? [...value.kitCategoryIds, categoryId] : value.kitCategoryIds.filter((each) => each !== categoryId) })

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
        <>
          <Field data-invalid={errors?.kitSize ? true : undefined} className="max-w-xs">
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

          <FieldSet>
            <FieldLegend id={`${id}-scope`}>{text.scope}</FieldLegend>
            <RadioGroup value={value.kitScope} onValueChange={(next) => onChange({ ...value, kitScope: next as ProductFormValues["kitScope"] })} disabled={disabled} aria-labelledby={`${id}-scope`} className="flex flex-col gap-2">
              {SCOPES.map((scope) => (
                <Field key={scope} orientation="horizontal">
                  <RadioGroupItem id={`${id}-${scope}`} value={scope} />
                  <FieldLabel htmlFor={`${id}-${scope}`} className="font-normal">
                    {scopeLabel[scope]}
                  </FieldLabel>
                </Field>
              ))}
            </RadioGroup>
          </FieldSet>

          {value.kitScope === "ALL" ? null : (
            <FieldSet data-invalid={errors?.kitCategoryIds ? true : undefined}>
              <FieldLegend id={`${id}-categories`} variant="label">
                {value.kitScope === "ONLY" ? text.categoriesOnly : text.categoriesExcept}
              </FieldLegend>
              <FieldDescription>{text.categoriesHint}</FieldDescription>
              {categories.length === 0 ? (
                <p className="text-muted-foreground text-sm">{text.categoriesNone}</p>
              ) : (
                <div className="grid gap-2 sm:grid-cols-2">
                  {categories.map((category) => (
                    <Field key={category.id} orientation="horizontal">
                      <Checkbox id={`${id}-category-${category.id}`} checked={ticked.has(category.id)} disabled={disabled} onCheckedChange={(on) => tick(category.id, on)} />
                      <FieldLabel htmlFor={`${id}-category-${category.id}`} className="font-normal">
                        {category.parentName ? `${category.parentName} › ${category.name}` : category.name}
                      </FieldLabel>
                    </Field>
                  ))}
                </div>
              )}
              {errors?.kitCategoryIds ? <FieldError>{errors.kitCategoryIds.message}</FieldError> : null}
            </FieldSet>
          )}
        </>
      ) : null}
    </div>
  )
}
