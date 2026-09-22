"use client"

// UI
import { Field, FieldDescription, FieldError, FieldLabel } from "@harness-monorepo/ui/components/field"
import { Input } from "@harness-monorepo/ui/components/input"

// Locales
import { defaultMessages } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import type { ProductFormIssues, ProductFormValues } from "./product-form-types"

export interface ProductPricingFieldsProps {
  value: ProductFormValues
  onChange: (value: ProductFormValues) => void
  errors?: ProductFormIssues
  disabled?: boolean
  messages?: UiMessages
}

/**
 * Price, what it was before, and what it cost the shop.
 *
 * All three are typed in reais and stored in whole cents, and the crossing happens in `./money`
 * and nowhere else. The legacy kept reais, cents and "R$ 25,00" in one column and chose between
 * them by guessing at the size of the number, which is how a product could sell for a hundredth
 * of its price.
 */
export function ProductPricingFields({
  value,
  onChange,
  errors,
  disabled = false,
  messages = defaultMessages,
}: ProductPricingFieldsProps) {
  const text = messages.catalog.products
  const fields = messages.catalog.fields

  function set(key: keyof ProductFormValues, next: string) {
    onChange({ ...value, [key]: next })
  }

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <Field data-invalid={errors?.price ? true : undefined}>
        <FieldLabel htmlFor="product-price">{text.priceLabel}</FieldLabel>
        <Input
          id="product-price"
          inputMode="decimal"
          autoComplete="off"
          disabled={disabled}
          aria-invalid={errors?.price ? true : undefined}
          value={value.price}
          onChange={(event) => set("price", event.target.value)}
        />
        {errors?.price ? (
          <FieldError>{errors.price.message}</FieldError>
        ) : (
          <FieldDescription>{text.priceHelp}</FieldDescription>
        )}
      </Field>

      <Field data-invalid={errors?.compareAtPrice ? true : undefined}>
        <FieldLabel htmlFor="product-compare">{text.compareLabel}</FieldLabel>
        <Input
          id="product-compare"
          inputMode="decimal"
          autoComplete="off"
          disabled={disabled}
          aria-invalid={errors?.compareAtPrice ? true : undefined}
          value={value.compareAtPrice}
          onChange={(event) => set("compareAtPrice", event.target.value)}
        />
        {errors?.compareAtPrice ? (
          <FieldError>{errors.compareAtPrice.message}</FieldError>
        ) : (
          <FieldDescription>{text.compareHelp}</FieldDescription>
        )}
      </Field>

      <Field>
        <FieldLabel htmlFor="product-cost">{fields.costLabel}</FieldLabel>
        <Input
          id="product-cost"
          inputMode="decimal"
          autoComplete="off"
          disabled={disabled}
          value={value.cost}
          onChange={(event) => set("cost", event.target.value)}
        />
        <FieldDescription>{fields.costHint}</FieldDescription>
      </Field>
    </div>
  )
}
