"use client"

// React
import { useEffect, useId, useRef, useState, type FormEvent } from "react"

// UI
import { Button } from "@harness-monorepo/ui/components/button"
import { Field, FieldDescription, FieldError, FieldLabel } from "@harness-monorepo/ui/components/field"
import { Input } from "@harness-monorepo/ui/components/input"
import { metaPixelIdOf } from "@harness-monorepo/ui/lib/integrations"

// Locales
import { defaultMessages } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

export interface MetaPixelIdFormProps {
  /** Hands over the ID as the API takes it: digits only, the white space it was pasted with gone. */
  onSubmit: (pixelId: string) => void
  pending?: boolean
  /** Why the API refused the last ID, in words. */
  error?: string
  /** The field's name where the ID replaces another; the plain one otherwise. */
  label?: string
  /** The button's name where the ID replaces another. */
  submitLabel?: string
  /** Leaves without sending anything. Absent where the form is all the card offers. */
  onCancel?: () => void
  messages?: UiMessages
}

/**
 * The field a shop's Meta Pixel ID is pasted into (BEELINK-270). The ID is no secret — any page that
 * loads a pixel shows it — so the field is plain and holds what was typed, unlike the Asaas key's.
 *
 * What is not an ID is said here and sent nowhere: the API would refuse it with the same sentence,
 * and a shopkeeper who pasted the pixel's whole code is told so before a round trip. The sentence
 * stays until the field changes, which is the only thing that can make it untrue.
 */
export function MetaPixelIdForm({ onSubmit, pending = false, error, label, submitLabel, onCancel, messages = defaultMessages }: MetaPixelIdFormProps) {
  const text = messages.integrations.metaPixel
  const id = useId()
  const field = useRef<HTMLInputElement>(null)
  const [typed, setTyped] = useState("")
  const [refused, setRefused] = useState(false)
  const said = refused ? text.errors.META_PIXEL_ID_INVALID : error

  // Locking the field while the ID is saved drops the focus it had: a refusal hands it back to
  // where the fix is typed.
  useEffect(() => {
    if (said && !pending) field.current?.focus()
  }, [said, pending])

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (pending || typed.trim() === "") return
    const pixelId = metaPixelIdOf(typed)
    if (pixelId === null) return setRefused(true)
    onSubmit(pixelId)
  }

  return (
    <form noValidate onSubmit={submit} aria-busy={pending || undefined} className="flex flex-col gap-3">
      <Field data-invalid={said ? true : undefined} className="max-w-xl">
        <FieldLabel htmlFor={`${id}-id`}>{label ?? text.idLabel}</FieldLabel>
        <Input
          ref={field}
          id={`${id}-id`}
          type="text"
          inputMode="numeric"
          placeholder={text.idPlaceholder}
          autoComplete="off"
          spellCheck={false}
          value={typed}
          disabled={pending}
          aria-invalid={said ? true : undefined}
          aria-describedby={said ? `${id}-error ${id}-help` : `${id}-help`}
          onChange={(event) => {
            setTyped(event.target.value)
            setRefused(false)
          }}
        />
        {said ? <FieldError id={`${id}-error`}>{said}</FieldError> : null}
        <FieldDescription id={`${id}-help`}>{text.idHint}</FieldDescription>
      </Field>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={pending || typed.trim() === ""}>
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
