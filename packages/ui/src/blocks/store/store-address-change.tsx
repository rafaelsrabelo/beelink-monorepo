"use client"

// React
import { useEffect, useId, useRef, useState, type FormEvent } from "react"

// Libs
import { CheckIcon } from "lucide-react"

// UI
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@harness-monorepo/ui/components/alert-dialog"
import { Badge } from "@harness-monorepo/ui/components/badge"
import { Button } from "@harness-monorepo/ui/components/button"
import { Field, FieldDescription, FieldLabel } from "@harness-monorepo/ui/components/field"
import { InputGroup, InputGroupAddon, InputGroupInput, InputGroupText } from "@harness-monorepo/ui/components/input-group"
import { Skeleton } from "@harness-monorepo/ui/components/skeleton"
import type { StoreAddressAvailability } from "@harness-monorepo/ui/lib/store-address"

// Locales
import { defaultMessages, format } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

export interface StoreAddressChangeProps {
  /** The address the page has, as a person reads it: `beelink.biz/minha-loja`. */
  currentAddress: string
  /** What every address of a page starts with, as read: `beelink.biz/`. */
  prefix: string
  /** What is typed. The screen holds it, because it asks the API about it. */
  value: string
  onValueChange: (value: string) => void
  /** The address as it would be stored — what is typed, normalised. Empty while nothing is. */
  preview: string
  /** What is known of `preview`: the API's answer, or that it is being asked. */
  availability: StoreAddressAvailability
  /** The first day another change is accepted, already in words; null when one can be made now. */
  lockedUntil: string | null
  /** The page's own domain, which no change of address touches; null when it has none. */
  customDomain: string | null
  onConfirm: () => void
  pending?: boolean
  /** Why the last change was refused, in words. */
  error?: string
  messages?: UiMessages
}

/** The look of a held button: the primitive dims `:disabled`, which a button kept focusable is not. */
const HELD = "aria-disabled:opacity-50"

/**
 * A page's new address (BEELINK-331), on a screen of its own: the address it has, the field with the
 * part that never changes in front of it, the address as it will be stored and whether it is free,
 * what a change does, and a question before it is made. Within 30 days of the last change, it says
 * from when another is accepted and offers no field.
 *
 * Nothing is refused here: the screen asks the API whether an address is free, and the change asks
 * again. The button waits for the answer, and stays focusable meanwhile.
 */
export function StoreAddressChange({ currentAddress, prefix, value, onValueChange, preview, availability, lockedUntil, customDomain, onConfirm, pending = false, error, messages = defaultMessages }: StoreAddressChangeProps) {
  const text = messages.store.addressChange
  const id = useId()
  const field = useRef<HTMLInputElement>(null)
  const [confirming, setConfirming] = useState(false)
  const ready = availability.state === "available" && !pending
  const refusal = availability.state === "unavailable" ? text.reasons[availability.reason] : undefined
  const said = pending ? undefined : (error ?? refusal)

  // A refusal of the change hands the focus back to where the fix is typed.
  useEffect(() => {
    if (error && !pending) field.current?.focus()
  }, [error, pending])

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (ready) setConfirming(true)
  }

  return (
    <section aria-labelledby={`${id}-title`} className="bg-shell-surface border-shell-border flex flex-col gap-4 rounded-xl border p-4 shadow-xs sm:p-6">
      <h1 id={`${id}-title`} className="text-2xl font-semibold">
        {text.title}
      </h1>
      <p className="text-muted-foreground text-sm break-words">{format(text.lead, { address: currentAddress })}</p>

      {lockedUntil ? (
        <p className="bg-muted rounded-lg px-3 py-3 text-sm">{format(text.lockedUntil, { date: lockedUntil })}</p>
      ) : (
        <form noValidate onSubmit={submit} aria-busy={pending || undefined} className="flex flex-col gap-4">
          <Field data-invalid={said ? true : undefined} className="max-w-xl">
            <FieldLabel htmlFor={`${id}-slug`}>{text.label}</FieldLabel>
            <InputGroup>
              <InputGroupAddon>
                <InputGroupText>{prefix}</InputGroupText>
              </InputGroupAddon>
              <InputGroupInput
                ref={field}
                id={`${id}-slug`}
                value={value}
                disabled={pending}
                inputMode="url"
                autoCapitalize="none"
                autoCorrect="off"
                autoComplete="off"
                spellCheck={false}
                aria-invalid={said ? true : undefined}
                aria-describedby={`${id}-hint ${id}-preview`}
                onChange={(event) => onValueChange(event.target.value)}
              />
            </InputGroup>
            <FieldDescription id={`${id}-hint`}>{text.hint}</FieldDescription>
          </Field>

          <div id={`${id}-preview`} role="status" className="flex min-h-10 flex-col gap-1 text-sm">
            {preview ? <p className="break-all">{format(text.preview, { address: `${prefix}${preview}` })}</p> : null}
            {availability.state === "checking" ? (
              <>
                <span className="sr-only">{text.checking}</span>
                <Skeleton aria-hidden="true" className="h-4 w-48" />
              </>
            ) : null}
            {availability.state === "available" && !error ? (
              <Badge variant="success" className="w-fit">
                <CheckIcon aria-hidden="true" />
                {text.available}
              </Badge>
            ) : null}
            {said ? <p className="text-destructive">{said}</p> : null}
          </div>

          <div className="flex flex-col gap-2">
            <h2 className="text-sm font-semibold">{text.consequencesTitle}</h2>
            <ul className="text-muted-foreground flex list-disc flex-col gap-1 pl-5 text-sm">
              <li>{text.consequences.oldLink}</li>
              <li>{text.consequences.reserved}</li>
              <li>{text.consequences.customers}</li>
              {customDomain ? <li className="break-words">{format(text.customDomain, { domain: customDomain })}</li> : null}
              <li>{text.consequences.interval}</li>
            </ul>
          </div>

          <Button type="submit" disabled={!ready} focusableWhenDisabled aria-busy={pending || undefined} className={`w-fit ${HELD}`}>
            {pending ? text.saving : text.submit}
          </Button>
        </form>
      )}

      <AlertDialog open={confirming} onOpenChange={(next: boolean) => setConfirming(next)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="break-words">{format(text.confirmTitle, { address: `${prefix}${preview}` })}</AlertDialogTitle>
            <AlertDialogDescription className="break-words">{format(text.confirmBody, { current: currentAddress })}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            {/* Keeping the address keeps the default focus: an Enter must not change it. */}
            <AlertDialogCancel>{text.confirmCancel}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setConfirming(false)
                onConfirm()
              }}
            >
              {text.confirmAction}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  )
}
