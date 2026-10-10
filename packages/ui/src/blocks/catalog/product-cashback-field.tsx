"use client"

// UI
import { Field, FieldDescription, FieldError, FieldLabel } from "@harness-monorepo/ui/components/field"
import { Input } from "@harness-monorepo/ui/components/input"

// Locales
import { defaultMessages } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import type { ProductFormIssues, ProductFormValues } from "./product-form-types"
import { ProductSection } from "./product-section"

export interface ProductCashbackFieldProps {
  value: ProductFormValues
  onChange: (value: ProductFormValues) => void
  errors?: ProductFormIssues
  disabled?: boolean
  messages?: UiMessages
}

/** The id the products' list sends "Adicionar cashback" to, so the page opens on this field. */
export const PRODUCT_CASHBACK_FIELD_ID = "product-cashback"

/**
 * The product's own cashback (BEELINK-313), a percentage as typed, in a card of its own. It is the
 * product's, whatever its variations — unlike the price, it is asked once, so it does not live in the
 * price's card, which a product with combinations empties. Left empty the product earns none: in a
 * shop that gives by product there is no other rate to fall back on.
 */
export function ProductCashbackField({ value, onChange, errors, disabled = false, messages = defaultMessages }: ProductCashbackFieldProps) {
  const text = messages.catalog.products
  const sections = messages.catalog.sections
  const issue = errors?.cashback

  return (
    <ProductSection title={sections.cashback} hint={sections.cashbackHint}>
      <Field data-invalid={issue ? true : undefined} className="max-w-64">
        <FieldLabel htmlFor={PRODUCT_CASHBACK_FIELD_ID}>{text.cashbackLabel}</FieldLabel>
        <Input
          id={PRODUCT_CASHBACK_FIELD_ID}
          inputMode="decimal"
          autoComplete="off"
          placeholder="5"
          disabled={disabled}
          aria-invalid={issue ? true : undefined}
          value={value.cashback}
          onChange={(event) => onChange({ ...value, cashback: event.target.value })}
        />
        {issue ? <FieldError>{issue.message}</FieldError> : <FieldDescription>{text.cashbackHelp}</FieldDescription>}
      </Field>
    </ProductSection>
  )
}
