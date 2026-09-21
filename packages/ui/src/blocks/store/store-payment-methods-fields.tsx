"use client"

// UI
import { Checkbox } from "@harness-monorepo/ui/components/checkbox"
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@harness-monorepo/ui/components/field"

// Locales
import { defaultMessages } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import { PAYMENT_METHODS, type FieldIssue, type PaymentMethod } from "./store-types"

export interface StorePaymentMethodsFieldsProps {
  value: PaymentMethod[]
  onChange: (value: PaymentMethod[]) => void
  error?: FieldIssue
  disabled?: boolean
  messages?: UiMessages
}

/**
 * What the shop takes at the door. Ticking none is refused by the schema, not merely warned about
 * as the legacy panel did — a checkout with no method cannot complete an order.
 */
export function StorePaymentMethodsFields({
  value,
  onChange,
  error,
  disabled = false,
  messages = defaultMessages,
}: StorePaymentMethodsFieldsProps) {
  const text = messages.store.payment
  const labels: Record<PaymentMethod, { label: string; hint: string }> = {
    MONEY: { label: text.money, hint: text.moneyHint },
    PIX: { label: text.pix, hint: text.pixHint },
    CREDIT_CARD: { label: text.creditCard, hint: text.creditCardHint },
    DEBIT_CARD: { label: text.debitCard, hint: text.debitCardHint },
  }

  // The stored order follows the declaration, not the order the boxes were ticked in.
  const toggle = (method: PaymentMethod, checked: boolean) =>
    onChange(
      PAYMENT_METHODS.filter((candidate) =>
        candidate === method ? checked : value.includes(candidate),
      ),
    )

  return (
    <FieldSet>
      <FieldLegend variant="label">{text.legend}</FieldLegend>
      <FieldDescription>{text.hint}</FieldDescription>
      <FieldGroup data-slot="checkbox-group">
        {PAYMENT_METHODS.map((method) => (
          <Field key={method} orientation="horizontal">
            <Checkbox
              id={`store-payment-${method}`}
              disabled={disabled}
              checked={value.includes(method)}
              aria-invalid={Boolean(error)}
              onCheckedChange={(checked) => toggle(method, checked)}
            />
            <FieldContent>
              <FieldLabel htmlFor={`store-payment-${method}`}>{labels[method].label}</FieldLabel>
              <FieldDescription>{labels[method].hint}</FieldDescription>
            </FieldContent>
          </Field>
        ))}
      </FieldGroup>
      <FieldError errors={[error]} />
    </FieldSet>
  )
}
