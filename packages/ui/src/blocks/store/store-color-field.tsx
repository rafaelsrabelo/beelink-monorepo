"use client"

// UI
import { Field, FieldError, FieldLabel } from "@harness-monorepo/ui/components/field"
import { Input } from "@harness-monorepo/ui/components/input"

// Block
import type { FieldIssue } from "./store-types"

export interface StoreColorFieldProps {
  id: string
  label: string
  /** `#RRGGBB`, straight from the shop's row. This field renders a colour; it never decides one. */
  value: string
  onChange: (value: string) => void
  error?: FieldIssue
  disabled?: boolean
  /** Names the native picker, so the two controls of one colour do not share an accessible name. */
  pickerSuffix: string
}

/**
 * One brand colour: the native picker for choosing it and the hexadecimal for pasting one. Both
 * write the same value, which is why neither holds a colour of its own — the swatch shown is
 * whatever the shop's row says.
 */
export function StoreColorField({
  id,
  label,
  value,
  onChange,
  error,
  disabled = false,
  pickerSuffix,
}: StoreColorFieldProps) {
  return (
    <Field>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <div className="flex items-center gap-2">
        <Input
          type="color"
          aria-label={`${label} (${pickerSuffix})`}
          className="size-8 shrink-0 cursor-pointer p-0.5"
          value={value}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value)}
        />
        <Input
          id={id}
          value={value}
          disabled={disabled}
          spellCheck={false}
          aria-invalid={Boolean(error)}
          onChange={(event) => onChange(event.target.value)}
        />
      </div>
      <FieldError errors={[error]} />
    </Field>
  )
}
