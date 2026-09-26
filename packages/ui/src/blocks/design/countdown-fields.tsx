"use client"

// UI
import { Field, FieldContent, FieldDescription, FieldLabel } from "@harness-monorepo/ui/components/field"
import { Input } from "@harness-monorepo/ui/components/input"

// Locales
import { defaultMessages } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

export interface CountdownFieldsProps {
  /** When it ends, on the shop's clock, as a `datetime-local` holds it: "2026-09-30T23:59", or `""`. */
  value: string
  onChange: (next: string) => void
  messages?: UiMessages
}

/**
 * When a countdown ends. Asked on the shop's clock and said so, whatever zone the owner's computer is
 * in: a sale that ends at midnight ends at the shop's midnight. The screen turns it into an instant.
 */
export function CountdownFields({ value, onChange, messages = defaultMessages }: CountdownFieldsProps) {
  const text = messages.design.countdown

  return (
    <Field>
      <FieldLabel htmlFor="countdown-ends">{text.ends}</FieldLabel>
      <FieldContent>
        <Input
          id="countdown-ends"
          type="datetime-local"
          value={value}
          aria-describedby="countdown-ends-help"
          onChange={(event) => onChange(event.target.value)}
        />
        <FieldDescription id="countdown-ends-help">{text.help}</FieldDescription>
      </FieldContent>
    </Field>
  )
}
