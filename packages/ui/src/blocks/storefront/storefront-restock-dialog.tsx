"use client"

// React
import { useState } from "react"

// UI
import { Button } from "@harness-monorepo/ui/components/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@harness-monorepo/ui/components/dialog"
import { Field, FieldLabel } from "@harness-monorepo/ui/components/field"
import { Input } from "@harness-monorepo/ui/components/input"

// Locales
import { defaultMessages, format } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

export interface RestockSubmission {
  phone: string
  name: string
  /** The trap: out of sight, and a person leaves it empty. */
  website: string
}

export interface StorefrontRestockDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  productName: string
  variantLabel: string
  onSubmit: (submission: RestockSubmission) => void
  status: "idle" | "sending" | "sent"
  /** A sentence, already in the visitor's language, when the request was refused. */
  error?: string | null
  /** The refusal is about the number, so the field is marked; other refusals are not its fault. */
  phoneInvalid?: boolean
  messages?: UiMessages
}

/**
 * "Avise-me": a WhatsApp number left for one sold-out combination.
 *
 * It says it was saved only once the screen says so — `status: "sent"` comes from the request's
 * answer, never from the press of the button — so a refused request is never shown as a success.
 */
export function StorefrontRestockDialog({
  open,
  onOpenChange,
  productName,
  variantLabel,
  onSubmit,
  status,
  error,
  phoneInvalid = false,
  messages = defaultMessages,
}: StorefrontRestockDialogProps) {
  const text = messages.storefront
  const [phone, setPhone] = useState("")
  const [name, setName] = useState("")
  const [website, setWebsite] = useState("")

  return (
    <Dialog open={open} onOpenChange={(next: boolean) => onOpenChange(next)}>
      <DialogContent closeLabel={text.restockCancel}>
        <DialogHeader>
          <DialogTitle>{text.restockTitle}</DialogTitle>
          <DialogDescription>
            {variantLabel
              ? format(text.restockDescription, { product: productName, variant: variantLabel })
              : productName}
          </DialogDescription>
        </DialogHeader>

        {status === "sent" ? (
          <p role="status" className="text-sm">
            {text.restockSent}
          </p>
        ) : (
          <form
            className="flex flex-col gap-4"
            onSubmit={(event) => {
              event.preventDefault()
              onSubmit({ phone: phone.trim(), name: name.trim(), website })
            }}
          >
            <Field>
              <FieldLabel htmlFor="restock-phone">{text.restockPhone}</FieldLabel>
              <Input
                id="restock-phone"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                required
                placeholder={text.restockPhonePlaceholder}
                value={phone}
                aria-invalid={error && phoneInvalid ? true : undefined}
                aria-describedby={error && phoneInvalid ? "restock-error" : undefined}
                onChange={(event) => setPhone(event.target.value)}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="restock-name">{text.restockName}</FieldLabel>
              <Input
                id="restock-name"
                autoComplete="name"
                // Counted in UTF-16 units, so whatever it lets through is within the API's 80 characters.
                maxLength={80}
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
            </Field>
            {/* The trap. Out of sight and out of the tab order; a person never fills it. */}
            <input
              type="text"
              name="website"
              tabIndex={-1}
              autoComplete="off"
              aria-hidden="true"
              className="absolute -left-[9999px] size-px opacity-0"
              value={website}
              onChange={(event) => setWebsite(event.target.value)}
            />
            {error ? (
              <p id="restock-error" role="alert" className="text-destructive text-sm">
                {error}
              </p>
            ) : null}
            <DialogFooter>
              {/* The design system's button: the dialog is portalled out of the shop window, where the
                  shop's own colour variables do not reach. */}
              <Button type="submit" className="w-full" disabled={status === "sending" || !phone.trim()}>
                {status === "sending" ? text.restockSending : text.restockSubmit}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
