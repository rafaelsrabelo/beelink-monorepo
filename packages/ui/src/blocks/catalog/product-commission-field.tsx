"use client"

// UI
import { Field, FieldDescription, FieldError, FieldLabel } from "@harness-monorepo/ui/components/field"
import { Input } from "@harness-monorepo/ui/components/input"

// Locales
import { defaultMessages, format } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import type { ProductFormIssues, ProductFormValues } from "./product-form-types"
import { ProductSection } from "./product-section"

export interface ProductCommissionFieldProps {
  value: ProductFormValues
  onChange: (value: ProductFormValues) => void
  /** The default table's rate, already in words ("10%"), which an empty field follows. */
  defaultRate: string
  /** The product's category's rate on the default table, in words, which an empty field follows instead; null when it has none. */
  categoryRate?: { name: string; rate: string } | null
  errors?: ProductFormIssues
  disabled?: boolean
  messages?: UiMessages
}

/** The id the products' list sends its commission column to, so the page opens on this field. */
export const PRODUCT_COMMISSION_FIELD_ID = "product-commission"

/**
 * The product's own affiliate commission on the shop's default table (IMPULSEIA-102), a percentage
 * as typed, in a card of its own like the cashback's. Empty, the product pays the table's rate; 0
 * pays nothing.
 */
export function ProductCommissionField({ value, onChange, defaultRate, categoryRate = null, errors, disabled = false, messages = defaultMessages }: ProductCommissionFieldProps) {
  const text = messages.catalog.products
  const sections = messages.catalog.sections
  const issue = errors?.commission

  return (
    <ProductSection title={sections.commission} hint={sections.commissionHint}>
      <Field data-invalid={issue ? true : undefined} className="max-w-md">
        <FieldLabel htmlFor={PRODUCT_COMMISSION_FIELD_ID}>{text.commissionLabel}</FieldLabel>
        <Input
          id={PRODUCT_COMMISSION_FIELD_ID}
          inputMode="decimal"
          autoComplete="off"
          className="max-w-64"
          disabled={disabled}
          aria-invalid={issue ? true : undefined}
          aria-describedby={`${PRODUCT_COMMISSION_FIELD_ID}-${issue ? "error" : "help"}`}
          value={value.commission}
          onChange={(event) => onChange({ ...value, commission: event.target.value })}
        />
        {issue ? (
          <FieldError id={`${PRODUCT_COMMISSION_FIELD_ID}-error`}>{issue.message}</FieldError>
        ) : (
          <FieldDescription id={`${PRODUCT_COMMISSION_FIELD_ID}-help`}>
            {categoryRate ? format(text.commissionHelpCategory, { name: categoryRate.name, rate: categoryRate.rate }) : format(text.commissionHelp, { rate: defaultRate })}
          </FieldDescription>
        )}
      </Field>
    </ProductSection>
  )
}
