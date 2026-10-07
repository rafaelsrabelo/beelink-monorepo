"use client"

// UI
import { Field, FieldDescription, FieldError, FieldLabel } from "@harness-monorepo/ui/components/field"
import { Input } from "@harness-monorepo/ui/components/input"
import { Textarea } from "@harness-monorepo/ui/components/textarea"

// Locales
import { defaultMessages, format } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

export interface PopupCopyFieldProps {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  /** The sentence drawn when this is left blank, shown in its place. */
  placeholder: string
  /** In code points, as the API counts. The field does not cut what is typed: the count says it is over. */
  max: number
  multiline?: boolean
  issue?: string
  disabled?: boolean
  messages?: UiMessages
}

/**
 * One sentence of the pop-up: a field whose placeholder is the default it stands in for, with how
 * much of its room is used. Past the limit the count stays honest and the field is marked — cutting
 * the text as it is typed would drop the end of a pasted sentence without a word.
 */
export function PopupCopyField({ id, label, value, onChange, placeholder, max, multiline = false, issue, disabled = false, messages = defaultMessages }: PopupCopyFieldProps) {
  const text = messages.discounts.popup
  const count = [...value].length
  const invalid = issue !== undefined || count > max
  const shared = {
    id,
    value,
    placeholder,
    disabled,
    "aria-invalid": invalid ? true : undefined,
    "aria-describedby": `${id}-count${issue ? ` ${id}-error` : ""}`,
  } as const

  return (
    <Field data-invalid={invalid ? true : undefined}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      {multiline ? <Textarea {...shared} rows={3} onChange={(event) => onChange(event.target.value)} /> : <Input {...shared} onChange={(event) => onChange(event.target.value)} />}
      <FieldDescription id={`${id}-count`} className={count > max ? "text-destructive" : undefined}>
        {format(text.counter, { count: String(count), max: String(max) })}
      </FieldDescription>
      {issue ? <FieldError id={`${id}-error`}>{issue}</FieldError> : null}
    </Field>
  )
}
