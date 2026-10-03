"use client"

// React
import { useId } from "react"

// UI
import { Field, FieldDescription, FieldError, FieldLabel, FieldLegend, FieldSet } from "@harness-monorepo/ui/components/field"
import { Input } from "@harness-monorepo/ui/components/input"
import type { OrderLabelFormValues, OrderLabelIssues } from "@harness-monorepo/ui/lib/label"

// Locales
import { defaultMessages } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

export interface OrderLabelFormProps {
  value: OrderLabelFormValues
  onChange: (value: OrderLabelFormValues) => void
  issues?: OrderLabelIssues
  disabled?: boolean
  messages?: UiMessages
}

const SIZES = ["weight", "length", "width", "height"] as const satisfies readonly (keyof OrderLabelFormValues)[]

/** The box a label is for and, for a commercial shipment, the invoice's key (BEELINK-187). */
export function OrderLabelForm({ value, onChange, issues = {}, disabled = false, messages = defaultMessages }: OrderLabelFormProps) {
  const text = messages.orders.label
  const id = useId()
  const set = (patch: Partial<OrderLabelFormValues>) => onChange({ ...value, ...patch })

  return (
    <div className="flex flex-col gap-4">
      <FieldSet data-invalid={issues.volume ? true : undefined} className="flex flex-col gap-2">
        <FieldLegend variant="label">{text.volume}</FieldLegend>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {SIZES.map((key) => (
            <Field key={key}>
              <FieldLabel htmlFor={`${id}-${key}`} className="text-xs">
                {text[key]}
              </FieldLabel>
              <Input
                id={`${id}-${key}`}
                inputMode="decimal"
                value={value[key]}
                disabled={disabled}
                aria-invalid={issues.volume ? true : undefined}
                aria-describedby={`${id}-volume-${issues.volume ? "error" : "help"}`}
                onChange={(event) => set({ [key]: event.target.value })}
              />
            </Field>
          ))}
        </div>
        {issues.volume ? <FieldError id={`${id}-volume-error`}>{issues.volume}</FieldError> : <FieldDescription id={`${id}-volume-help`}>{text.volumeHint}</FieldDescription>}
      </FieldSet>

      <Field data-invalid={issues.invoiceKey ? true : undefined}>
        <FieldLabel htmlFor={`${id}-invoice`}>{text.invoiceKey}</FieldLabel>
        <Input
          id={`${id}-invoice`}
          inputMode="numeric"
          autoComplete="off"
          value={value.invoiceKey}
          disabled={disabled}
          aria-invalid={issues.invoiceKey ? true : undefined}
          aria-describedby={`${id}-invoice-${issues.invoiceKey ? "error" : "help"}`}
          onChange={(event) => set({ invoiceKey: event.target.value })}
        />
        {issues.invoiceKey ? <FieldError id={`${id}-invoice-error`}>{issues.invoiceKey}</FieldError> : <FieldDescription id={`${id}-invoice-help`}>{text.invoiceKeyHint}</FieldDescription>}
      </Field>
    </div>
  )
}
