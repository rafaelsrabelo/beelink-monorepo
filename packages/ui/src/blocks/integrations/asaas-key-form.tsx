"use client"

// React
import { useEffect, useId, useRef, useState, type FormEvent } from "react"

// Libs
import { EyeIcon, EyeOffIcon } from "lucide-react"

// UI
import { Button } from "@harness-monorepo/ui/components/button"
import { Field, FieldDescription, FieldError, FieldLabel } from "@harness-monorepo/ui/components/field"
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from "@harness-monorepo/ui/components/input-group"

// Locales
import { defaultMessages } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

export interface AsaasKeyFormProps {
  /** Hands the key over once, as it is sent, trimmed. Nothing else ever holds it: it is no prop of this form. */
  onSubmit: (apiKey: string) => void
  /** The key is being checked at Asaas, which takes seconds: the field is locked and the button busy. */
  pending?: boolean
  /** Why the last key was refused, in words. */
  error?: string
  /** The field's name where the key replaces another; the plain one otherwise. */
  label?: string
  /** The button's name where connecting mends or replaces a connection. */
  submitLabel?: string
  /** Leaves without sending anything. Absent where the form is all the card offers. */
  onCancel?: () => void
  messages?: UiMessages
}

/**
 * The field a shop's Asaas API key is pasted into (BEELINK-203). The key creates charges in the
 * shop's own account, so it is treated as a secret: masked until asked to be shown, and gone with
 * the form once a connection is made. It is no login password either — nothing here names it as
 * one, and the password managers are told to leave the field be.
 *
 * The field is uncontrolled on purpose. React mirrors a controlled input's value into its `value`
 * attribute, which would write the key into the page's markup; left to the field, the key is in
 * no attribute and in no state, and this component only knows whether something was typed.
 */
export function AsaasKeyForm({ onSubmit, pending = false, error, label, submitLabel, onCancel, messages = defaultMessages }: AsaasKeyFormProps) {
  const text = messages.integrations.asaas
  const id = useId()
  const field = useRef<HTMLInputElement>(null)
  const [typed, setTyped] = useState(false)
  const [shown, setShown] = useState(false)

  // Locking the field while the key is checked drops the focus it had: a refusal hands it back to
  // where the fix is typed.
  useEffect(() => {
    if (error && !pending) field.current?.focus()
  }, [error, pending])

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const key = field.current?.value.trim()
    if (!key || pending) return
    setShown(false)
    onSubmit(key)
  }

  return (
    <form noValidate onSubmit={submit} aria-busy={pending || undefined} className="flex flex-col gap-3">
      <Field data-invalid={error ? true : undefined} className="max-w-xl">
        <FieldLabel htmlFor={`${id}-key`}>{label ?? text.keyLabel}</FieldLabel>
        <InputGroup>
          <InputGroupInput
            ref={field}
            id={`${id}-key`}
            type={shown ? "text" : "password"}
            placeholder={text.keyPlaceholder}
            autoComplete="off"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            data-1p-ignore=""
            data-lpignore="true"
            data-bwignore="true"
            data-form-type="other"
            disabled={pending}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? `${id}-error ${id}-help` : `${id}-help`}
            onChange={(event) => setTyped(event.target.value.trim() !== "")}
          />
          <InputGroupAddon align="inline-end">
            <InputGroupButton size="icon-xs" aria-label={shown ? text.hideKey : text.showKey} aria-controls={`${id}-key`} disabled={pending} onClick={() => setShown(!shown)}>
              {shown ? <EyeOffIcon aria-hidden="true" /> : <EyeIcon aria-hidden="true" />}
            </InputGroupButton>
          </InputGroupAddon>
        </InputGroup>
        {error ? <FieldError id={`${id}-error`}>{error}</FieldError> : null}
        <FieldDescription id={`${id}-help`}>{text.keyHint}</FieldDescription>
      </Field>

      <div className="flex flex-wrap items-center gap-3">
        {/* Nothing typed, nothing to send: an empty try would only spend one of the few a minute allows. */}
        <Button type="submit" disabled={pending || !typed}>
          {pending ? text.connecting : (submitLabel ?? text.connectSubmit)}
        </Button>
        {onCancel ? (
          <Button type="button" variant="outline" disabled={pending} onClick={onCancel}>
            {text.replaceCancel}
          </Button>
        ) : null}
      </div>
    </form>
  )
}
