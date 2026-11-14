// UI
import { Field, FieldDescription, FieldError, FieldLabel } from "@harness-monorepo/ui/components/field"
import { Input } from "@harness-monorepo/ui/components/input"
import { Textarea } from "@harness-monorepo/ui/components/textarea"

// Locales
import { defaultMessages, format } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

export interface AffiliatePageTextFieldProps {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  /** The most characters it takes, said under it as it fills. */
  max: number
  /** A paragraph rather than a line. */
  rows?: number
  /** Why it does not hold, in words. */
  issue?: string
  disabled?: boolean
  messages?: UiMessages
}

/** One text of the "Seja afiliado" page (plan 2026-11-14): its label, what was typed and how much room is left. */
export function AffiliatePageTextField({ id, label, value, onChange, max, rows, issue, disabled = false, messages = defaultMessages }: AffiliatePageTextFieldProps) {
  const text = messages.affiliatePage.editor
  const count = format(text.count, { count: String([...value].length), max: String(max) })
  const describedBy = `${id}-${issue ? "error" : "count"}`
  const shared = { id, value, disabled, "aria-invalid": issue ? true : undefined, "aria-describedby": describedBy } as const

  return (
    <Field data-invalid={issue ? true : undefined}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      {rows ? <Textarea {...shared} rows={rows} onChange={(event) => onChange(event.target.value)} /> : <Input {...shared} onChange={(event) => onChange(event.target.value)} />}
      {issue ? <FieldError id={`${id}-error`}>{issue}</FieldError> : <FieldDescription id={`${id}-count`}>{count}</FieldDescription>}
    </Field>
  )
}
