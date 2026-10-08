"use client"

// React
import { useEffect, useId, useRef, useState, type FormEvent } from "react"

// UI
import { Button } from "@harness-monorepo/ui/components/button"
import { Field, FieldDescription, FieldError, FieldLabel } from "@harness-monorepo/ui/components/field"
import { Input } from "@harness-monorepo/ui/components/input"

// Locales
import { defaultMessages } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

export interface CustomDomainFormProps {
  /** Hands over what was typed, less the white space around it. */
  onSubmit: (domain: string) => void
  pending?: boolean
  /** Why the API refused the last domain, in words. */
  error?: string
  messages?: UiMessages
}

/**
 * The field a shop's own domain is typed into (BEELINK-285). Nothing but an empty field is refused
 * here: the API reads a pasted address down to its host — `https://www.MinhaLoja.com.br/` is
 * `minhaloja.com.br` there — and alone decides what a domain is. A second copy of that rule on this
 * side would be two to keep alike.
 */
export function CustomDomainForm({ onSubmit, pending = false, error, messages = defaultMessages }: CustomDomainFormProps) {
  const text = messages.customDomain.form
  const id = useId()
  const field = useRef<HTMLInputElement>(null)
  const [typed, setTyped] = useState("")
  const empty = typed.trim() === ""

  // Locking the field while the domain is saved drops the focus it had: a refusal hands it back to
  // where the fix is typed.
  useEffect(() => {
    if (error && !pending) field.current?.focus()
  }, [error, pending])

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (pending || empty) return
    onSubmit(typed.trim())
  }

  return (
    <form noValidate onSubmit={submit} aria-busy={pending || undefined} className="flex flex-col gap-3">
      <Field data-invalid={error ? true : undefined} className="max-w-xl">
        <FieldLabel htmlFor={`${id}-domain`}>{text.label}</FieldLabel>
        <Input
          ref={field}
          id={`${id}-domain`}
          type="text"
          inputMode="url"
          autoCapitalize="none"
          autoCorrect="off"
          autoComplete="off"
          spellCheck={false}
          placeholder={text.placeholder}
          value={typed}
          disabled={pending}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error ${id}-help` : `${id}-help`}
          onChange={(event) => setTyped(event.target.value)}
        />
        {error ? <FieldError id={`${id}-error`}>{error}</FieldError> : null}
        <FieldDescription id={`${id}-help`}>{text.hint}</FieldDescription>
      </Field>

      <div className="flex">
        <Button type="submit" disabled={pending || empty}>
          {pending ? text.saving : text.submit}
        </Button>
      </div>
    </form>
  )
}
