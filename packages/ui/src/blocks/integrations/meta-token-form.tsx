"use client"

// React
import { useEffect, useId, useRef, useState, type FormEvent } from "react"

// Libs
import { EyeIcon, EyeOffIcon } from "lucide-react"

// UI
import { Button } from "@harness-monorepo/ui/components/button"
import { Field, FieldDescription, FieldError, FieldLabel } from "@harness-monorepo/ui/components/field"
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from "@harness-monorepo/ui/components/input-group"
import { metaTokenOf } from "@harness-monorepo/ui/lib/integrations"

// Locales
import { defaultMessages } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

export interface MetaTokenFormProps {
  /** Hands the token over once, as it is sent, trimmed. Nothing else ever holds it: it is no prop of this form. */
  onSubmit: (accessToken: string) => void
  pending?: boolean
  /** Why the API refused the last token, in words. */
  error?: string
  /** The field's name where the token replaces another; the plain one otherwise. */
  label?: string
  /** The button's name where the token replaces another. */
  submitLabel?: string
  /** Leaves without sending anything. Absent where the form is all the card offers. */
  onCancel?: () => void
  messages?: UiMessages
}

/**
 * The field a pixel's Conversions API token is pasted into (BEELINK-274). The token sends events
 * to the shop's own Meta account, so it is a secret like the Asaas key: masked until asked to be
 * shown, never filled in with one saved before, and gone with the form once it is saved. It is no
 * login password — nothing here names it as one, and the password managers are told to leave it be.
 *
 * Uncontrolled on purpose, as `AsaasKeyForm` is: React mirrors a controlled input's value into its
 * `value` attribute, which would write the token into the page's markup. What is plainly no token
 * is said here and sent nowhere; the sentence stays until the field changes.
 */
export function MetaTokenForm({ onSubmit, pending = false, error, label, submitLabel, onCancel, messages = defaultMessages }: MetaTokenFormProps) {
  const text = messages.integrations.metaConversions
  const id = useId()
  const field = useRef<HTMLInputElement>(null)
  const [typed, setTyped] = useState(false)
  const [shown, setShown] = useState(false)
  const [refused, setRefused] = useState(false)
  const said = refused ? text.errors.META_PIXEL_TOKEN_INVALID : error

  // Locking the field while the token is saved drops the focus it had: a refusal hands it back to
  // where the fix is pasted.
  useEffect(() => {
    if (said && !pending) field.current?.focus()
  }, [said, pending])

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const pasted = field.current?.value ?? ""
    if (pending || pasted.trim() === "") return
    const accessToken = metaTokenOf(pasted)
    if (accessToken === null) return setRefused(true)
    setShown(false)
    onSubmit(accessToken)
  }

  return (
    <form noValidate onSubmit={submit} aria-busy={pending || undefined} className="flex flex-col gap-3">
      <Field data-invalid={said ? true : undefined} className="max-w-xl">
        <FieldLabel htmlFor={`${id}-token`}>{label ?? text.tokenLabel}</FieldLabel>
        <InputGroup>
          <InputGroupInput
            ref={field}
            id={`${id}-token`}
            type={shown ? "text" : "password"}
            placeholder={text.tokenPlaceholder}
            autoComplete="off"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            data-1p-ignore=""
            data-lpignore="true"
            data-bwignore="true"
            data-form-type="other"
            disabled={pending}
            aria-invalid={said ? true : undefined}
            aria-describedby={said ? `${id}-error ${id}-help` : `${id}-help`}
            onChange={(event) => {
              setTyped(event.target.value.trim() !== "")
              setRefused(false)
            }}
          />
          <InputGroupAddon align="inline-end">
            <InputGroupButton size="icon-xs" aria-label={shown ? text.hideToken : text.showToken} aria-controls={`${id}-token`} disabled={pending} onClick={() => setShown(!shown)}>
              {shown ? <EyeOffIcon aria-hidden="true" /> : <EyeIcon aria-hidden="true" />}
            </InputGroupButton>
          </InputGroupAddon>
        </InputGroup>
        {said ? <FieldError id={`${id}-error`}>{said}</FieldError> : null}
        <FieldDescription id={`${id}-help`}>{text.tokenHint}</FieldDescription>
      </Field>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={pending || !typed}>
          {pending ? text.tokenSaving : (submitLabel ?? text.tokenSubmit)}
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
