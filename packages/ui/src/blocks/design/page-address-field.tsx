"use client"

// UI
import { Field, FieldContent, FieldDescription, FieldLabel } from "@harness-monorepo/ui/components/field"
import { Input } from "@harness-monorepo/ui/components/input"
import { cn } from "@harness-monorepo/ui/lib/utils"

// Locales
import { defaultMessages } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

/** What the API said about the address, or that it is being asked. */
export type PageAddressState = "idle" | "checking" | "available" | "taken" | "invalid"

export interface PageAddressFieldProps {
  id: string
  /** What comes before the address in the shop: "/mutante/lp/". */
  prefix: string
  value: string
  onChange: (value: string) => void
  state: PageAddressState
  messages?: UiMessages
}

/**
 * A landing's address, after the shop's own, and whether it is free — asked as it is typed, and
 * said in words beside it, so a taken address is known before "Criar" rather than after.
 */
export function PageAddressField({ id, prefix, value, onChange, state, messages = defaultMessages }: PageAddressFieldProps) {
  const text = messages.design.pages.form
  const said: Record<PageAddressState, string | null> = {
    idle: null,
    checking: text.addressChecking,
    available: text.addressAvailable,
    taken: text.addressTaken,
    invalid: text.addressInvalid,
  }

  return (
    <Field>
      <FieldLabel htmlFor={id}>{text.address}</FieldLabel>
      <FieldContent>
        <div className="border-input focus-within:ring-ring/50 focus-within:border-ring flex items-center rounded-md border focus-within:ring-3">
          <span className="text-muted-foreground shrink-0 pl-3 text-sm">{prefix}</span>
          <Input
            id={id}
            value={value}
            onChange={(event) => onChange(event.target.value)}
            aria-invalid={state === "taken" || state === "invalid" ? true : undefined}
            aria-describedby={`${id}-state`}
            autoComplete="off"
            className="border-0 pl-0.5 shadow-none focus-visible:ring-0"
          />
        </div>
        <FieldDescription
          id={`${id}-state`}
          aria-live="polite"
          className={cn(state === "taken" || state === "invalid" ? "text-destructive" : undefined, !said[state] && "sr-only")}
        >
          {said[state] ?? ""}
        </FieldDescription>
      </FieldContent>
    </Field>
  )
}
