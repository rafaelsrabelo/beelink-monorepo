"use client"

// React
import { useId } from "react"

// UI
import { Field, FieldDescription, FieldError, FieldLabel } from "@harness-monorepo/ui/components/field"
import { Input } from "@harness-monorepo/ui/components/input"

// Locales
import { defaultMessages } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

export interface DiscountPeriodFieldsProps {
  /** `yyyy-mm-ddThh:mm`, in the shop's own time. */
  startsAt: string
  /** Empty has no end. */
  endsAt: string
  onChange: (patch: { startsAt?: string; endsAt?: string }) => void
  issues?: { startsAt?: string; endsAt?: string }
  disabled?: boolean
  messages?: UiMessages
}

/**
 * When it starts and when it ends, to the minute; an end left blank runs until the owner pauses it.
 *
 * The two inputs are named `startsAt` and `endsAt`: a field with only its date typed reports an empty
 * value, so the form asks the browser by name which one is half-typed (`halfTypedDates`).
 */
export function DiscountPeriodFields({ startsAt, endsAt, onChange, issues = {}, disabled = false, messages = defaultMessages }: DiscountPeriodFieldsProps) {
  const text = messages.discounts
  const id = useId()

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field data-invalid={issues.startsAt ? true : undefined}>
        <FieldLabel htmlFor={`${id}-starts`}>{text.startsAtLabel}</FieldLabel>
        <Input
          id={`${id}-starts`}
          name="startsAt"
          type="datetime-local"
          value={startsAt}
          disabled={disabled}
          aria-invalid={issues.startsAt ? true : undefined}
          aria-describedby={`${id}-starts-note`}
          onChange={(event) => onChange({ startsAt: event.target.value })}
        />
        {issues.startsAt ? <FieldError id={`${id}-starts-note`}>{issues.startsAt}</FieldError> : <FieldDescription id={`${id}-starts-note`}>{text.startsAtHelp}</FieldDescription>}
      </Field>
      <Field data-invalid={issues.endsAt ? true : undefined}>
        <FieldLabel htmlFor={`${id}-ends`}>{text.endsAtLabel}</FieldLabel>
        <Input
          id={`${id}-ends`}
          name="endsAt"
          type="datetime-local"
          value={endsAt}
          min={startsAt || undefined}
          disabled={disabled}
          aria-invalid={issues.endsAt ? true : undefined}
          aria-describedby={`${id}-ends-note`}
          onChange={(event) => onChange({ endsAt: event.target.value })}
        />
        {issues.endsAt ? <FieldError id={`${id}-ends-note`}>{issues.endsAt}</FieldError> : <FieldDescription id={`${id}-ends-note`}>{text.endsAtHelp}</FieldDescription>}
      </Field>
    </div>
  )
}
