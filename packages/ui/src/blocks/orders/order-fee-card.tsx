"use client"

// React
import { useId, useState, type FormEvent } from "react"

// UI
import { Button } from "@harness-monorepo/ui/components/button"
import { Field, FieldDescription, FieldLabel } from "@harness-monorepo/ui/components/field"
import { Input } from "@harness-monorepo/ui/components/input"
import { centsFrom, reaisFrom } from "@harness-monorepo/ui/lib/money"

// Locales
import { defaultMessages } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

export interface OrderFeeCardProps {
  /** The fee agreed, in cents, or null while it is not. The field starts from it, and over again when a save changes it. */
  feeCents: number | null
  onSave: (feeCents: number) => void
  pending?: boolean
  /** Why the last save did not go through, in words. */
  error?: string | null
  /** The last save went through. */
  saved?: boolean
  messages?: UiMessages
}

/**
 * A delivery's fee, told on the opened order once it is agreed (BEELINK-170). The total and the
 * customer's order follow it; zero is a free delivery, told as such.
 */
export function OrderFeeCard({ feeCents, onSave, pending = false, error, saved = false, messages = defaultMessages }: OrderFeeCardProps) {
  const text = messages.orders.detail
  const id = useId()
  const [seen, setSeen] = useState(feeCents)
  const [draft, setDraft] = useState(() => reaisFrom(feeCents))
  const [edited, setEdited] = useState(false)
  const [invalid, setInvalid] = useState(false)
  // Started over in the render a save lands in, never remounted: the field and its focus stay.
  if (feeCents !== seen) {
    setSeen(feeCents)
    setDraft(reaisFrom(feeCents))
    setEdited(false)
  }

  function save(event: FormEvent) {
    event.preventDefault()
    // The button stays focusable while saving, so Enter in the field could send it twice.
    if (pending) return
    const cents = centsFrom(draft)
    setInvalid(cents === null)
    if (cents !== null) onSave(cents)
  }

  const message = invalid ? text.feeFormInvalid : error

  return (
    <section aria-labelledby={`${id}-title`} className="bg-shell-surface border-shell-border flex flex-col gap-3 rounded-xl border p-4 shadow-xs">
      <h2 id={`${id}-title`} className="font-semibold">
        {text.feeFormTitle}
      </h2>
      <form onSubmit={save} className="flex flex-col gap-3">
        <Field data-invalid={message ? true : undefined} className="max-w-48">
          <FieldLabel htmlFor={`${id}-fee`}>{text.feeFormLabel}</FieldLabel>
          <Input
            id={`${id}-fee`}
            inputMode="decimal"
            placeholder="0,00"
            value={draft}
            aria-invalid={message ? true : undefined}
            aria-describedby={feeCents === null ? `${id}-hint` : undefined}
            onChange={(event) => {
              setDraft(event.target.value)
              setEdited(true)
              setInvalid(false)
            }}
          />
          {feeCents === null ? <FieldDescription id={`${id}-hint`}>{text.feeFormHint}</FieldDescription> : null}
        </Field>

        {message ? (
          <p role="alert" className="text-destructive text-sm">
            {message}
          </p>
        ) : null}
        <p aria-live="polite" className="text-muted-foreground text-sm">
          {saved && !error && !edited ? text.feeFormSaved : null}
        </p>

        <div>
          {/* Focusable while saving: a disabled button drops the focus to the page's start. */}
          <Button type="submit" disabled={pending} focusableWhenDisabled>
            {text.feeFormSave}
          </Button>
        </div>
      </form>
    </section>
  )
}
