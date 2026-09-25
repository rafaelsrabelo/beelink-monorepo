"use client"

// UI
import { Field, FieldDescription, FieldError, FieldLabel } from "@harness-monorepo/ui/components/field"
import { Input } from "@harness-monorepo/ui/components/input"

// Locales
import { defaultMessages } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import type { ProductFormIssues, ProductFormValues } from "./product-form-types"

export interface ProductShippingFieldsProps {
  value: ProductFormValues
  onChange: (value: ProductFormValues) => void
  errors?: ProductFormIssues
  /** The product has variations: each combination carries its own weight; the box stays here. */
  perCombination?: boolean
  disabled?: boolean
  messages?: UiMessages
}

/**
 * The parcel, which is what a carrier quotes on.
 *
 * Centimetres here and millimetres on the wire: a shopkeeper measures a box in centimetres, and a
 * float of centimetres in the database is the same ambiguity money already taught this product to
 * avoid. The screen multiplies by ten, once.
 *
 * All three sides or none — the API refuses the rest, because a box with two sides is not a box
 * and a shipping API would refuse it later, while a customer waits at a checkout.
 */
export function ProductShippingFields({
  value,
  onChange,
  errors,
  perCombination = false,
  disabled = false,
  messages = defaultMessages,
}: ProductShippingFieldsProps) {
  const fields = messages.catalog.fields

  function set(key: keyof ProductFormValues, next: string) {
    onChange({ ...value, [key]: next })
  }

  const sides = [
    { key: "length", label: fields.lengthLabel },
    { key: "width", label: fields.widthLabel },
    { key: "height", label: fields.heightLabel },
  ] as const

  return (
    <div className="flex flex-col gap-4">
      {perCombination ? (
        <p className="text-muted-foreground text-sm">{fields.weightPerCombination}</p>
      ) : (
        <Field>
          <FieldLabel htmlFor="product-weight">{fields.weightLabel}</FieldLabel>
          <Input
            id="product-weight"
            inputMode="numeric"
            autoComplete="off"
            disabled={disabled}
            className="max-w-40"
            value={value.weight}
            onChange={(event) => set("weight", event.target.value)}
          />
          <FieldDescription>{fields.weightHint}</FieldDescription>
        </Field>
      )}

      <Field data-invalid={errors?.length ? true : undefined}>
        <FieldLabel>{fields.dimensionsLabel}</FieldLabel>
        <div className="grid grid-cols-3 gap-3">
          {sides.map((side) => (
            <Input
              key={side.key}
              inputMode="numeric"
              autoComplete="off"
              disabled={disabled}
              aria-label={side.label}
              placeholder={side.label}
              value={value[side.key]}
              onChange={(event) => set(side.key, event.target.value)}
            />
          ))}
        </div>
        {errors?.length ? (
          <FieldError>{errors.length.message}</FieldError>
        ) : (
          <FieldDescription>{fields.dimensionsHint}</FieldDescription>
        )}
      </Field>
    </div>
  )
}
