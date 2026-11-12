"use client"

// React
import { useId } from "react"

// UI
import { Button } from "@harness-monorepo/ui/components/button"
import { Field, FieldDescription, FieldError, FieldLabel } from "@harness-monorepo/ui/components/field"
import { Input } from "@harness-monorepo/ui/components/input"

// Locales
import { defaultMessages } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

export interface CommissionGeneralRateProps {
  /** The rate as typed, `10` or `12,5`. */
  value: string
  onChange: (value: string) => void
  onSubmit: () => void
  /** What is typed is what is saved: there is nothing to save. */
  pristine?: boolean
  pending?: boolean
  issue?: string
  /** The last save, or the API's refusal, in words. */
  status?: string
  messages?: UiMessages
}

/**
 * A table's general rate, edited where its rates are (the user's review, 12/11/2026): what every
 * product pays unless its category or the product itself has a rate of its own — the Padrão's too.
 */
export function CommissionGeneralRate({ value, onChange, onSubmit, pristine = false, pending = false, issue, status, messages = defaultMessages }: CommissionGeneralRateProps) {
  const text = messages.affiliates.table
  const id = useId()

  return (
    <section aria-labelledby={`${id}-title`} className="bg-shell-surface border-shell-border rounded-xl border p-4 shadow-xs sm:p-6">
      <form
        noValidate
        className="flex flex-col gap-3"
        onSubmit={(event) => {
          event.preventDefault()
          onSubmit()
        }}
      >
        <h3 id={`${id}-title`} className="font-semibold">
          {text.general}
        </h3>
        <Field data-invalid={issue ? true : undefined}>
          <FieldLabel htmlFor={`${id}-rate`}>{text.generalLabel}</FieldLabel>
          <div className="flex items-center gap-2">
            <Input
              id={`${id}-rate`}
              inputMode="decimal"
              autoComplete="off"
              className="w-24"
              value={value}
              disabled={pending}
              aria-invalid={issue ? true : undefined}
              aria-describedby={`${id}-help`}
              onChange={(event) => onChange(event.target.value)}
            />
            <span className="text-muted-foreground text-sm">%</span>
            <Button type="submit" size="sm" disabled={pending || pristine}>
              {pending ? text.generalSaving : text.saveLabel}
            </Button>
          </div>
          {issue ? <FieldError id={`${id}-help`}>{issue}</FieldError> : <FieldDescription id={`${id}-help`}>{text.generalHelp}</FieldDescription>}
        </Field>
        <p aria-live="polite" className="text-muted-foreground min-h-5 text-sm">
          {status}
        </p>
      </form>
    </section>
  )
}
