"use client"

// React
import { useId } from "react"

// UI
import { Field, FieldDescription, FieldError, FieldLabel, FieldLegend, FieldSet } from "@harness-monorepo/ui/components/field"
import { Input } from "@harness-monorepo/ui/components/input"

// Locales
import { defaultMessages } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import type { FieldIssue } from "./store-types"

export interface StoreCustomersFieldsProps {
  value: { inactiveAfterDays: number }
  onChange: (value: { inactiveAfterDays: number }) => void
  error?: FieldIssue
  disabled?: boolean
  messages?: UiMessages
}

/**
 * After how long without an order a customer reads as inactive. A stage is computed when read, so
 * the new number applies to every customer the moment it is saved.
 */
export function StoreCustomersFields({ value, onChange, error, disabled = false, messages = defaultMessages }: StoreCustomersFieldsProps) {
  const text = messages.store.customers
  const id = useId()

  return (
    <FieldSet>
      <FieldLegend variant="label">{text.legend}</FieldLegend>
      <Field data-invalid={error ? true : undefined}>
        <FieldLabel htmlFor={id}>{text.inactiveAfterDays}</FieldLabel>
        <div className="flex items-center gap-2">
          <Input
            id={id}
            type="number"
            inputMode="numeric"
            min={7}
            max={365}
            step={1}
            className="w-24 tabular-nums"
            // An emptied box is not a number, which the schema refuses in words rather than as zero.
            value={Number.isNaN(value.inactiveAfterDays) ? "" : value.inactiveAfterDays}
            aria-invalid={error ? true : undefined}
            aria-describedby={`${id}-days`}
            disabled={disabled}
            onChange={(event) => onChange({ inactiveAfterDays: event.target.value === "" ? Number.NaN : Number(event.target.value) })}
          />
          <span id={`${id}-days`} className="text-muted-foreground text-sm">
            {text.days}
          </span>
        </div>
        <FieldDescription>{text.hint}</FieldDescription>
        <FieldError errors={error ? [error] : undefined} />
      </Field>
    </FieldSet>
  )
}
