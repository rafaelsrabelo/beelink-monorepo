"use client"

// React
import { useEffect, useId } from "react"

// Libs
import { TicketPercentIcon, TriangleAlertIcon } from "lucide-react"
import { useForm } from "react-hook-form"

// UI
import { Button } from "@harness-monorepo/ui/components/button"
import { Field, FieldError, FieldLabel } from "@harness-monorepo/ui/components/field"
import { Input } from "@harness-monorepo/ui/components/input"

// Locales
import { defaultMessages } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

/** The longest code a coupon has: a longer one could match none. */
const CODE_MAX_LENGTH = 30

export interface SubscriptionCouponProps {
  /** The code as typed, trimmed. The screen sends it and says what came of it: this block reaches no network. */
  onSubmit: (code: string) => void
  pending?: boolean
  /** Why the last code was not taken, in a sentence the screen made. This block never sees an `errorCode`. */
  error?: string
  /** The page has an invoice open, which using a coupon takes out: said before the button is pressed. */
  invoiceOpen?: boolean
  messages?: UiMessages
}

/**
 * A coupon of bee-link's on the Assinar screen (BEELINK-224): one free month for the page — never a
 * discount — typed into a form of its own beside the checkout's, since it chooses no cycle. What it
 * gives and when it begins is said first; an empty field is refused here, and anything else is the
 * screen's to send and to answer, said on the field and read out as it comes.
 */
export function SubscriptionCoupon({ onSubmit, pending = false, error, invoiceOpen = false, messages = defaultMessages }: SubscriptionCouponProps) {
  const text = messages.subscription.coupon
  const id = useId()
  const form = useForm<{ code: string }>({ defaultValues: { code: "" } })
  const field = form.register("code", { validate: (typed) => typed.trim() !== "" || text.empty })
  const said = form.formState.errors.code?.message ?? error

  // The code was refused: the person is taken back to it, to type another.
  useEffect(() => {
    if (error) form.setFocus("code")
  }, [error, form])

  return (
    <section aria-labelledby={`${id}-title`} className="bg-shell-surface border-shell-border flex flex-col gap-3 rounded-xl border p-4 shadow-xs sm:p-6">
      <h2 id={`${id}-title`} className="flex items-center gap-2 text-base font-semibold">
        <TicketPercentIcon aria-hidden="true" className="size-5 shrink-0" />
        {text.title}
      </h2>
      {/* On the panel's own ground, where `muted-foreground` is under 4.5:1: the shell's muted is drawn for it. */}
      <p className="text-shell-muted text-sm">{text.lead}</p>

      <form noValidate aria-busy={pending || undefined} onSubmit={form.handleSubmit((values) => onSubmit(values.code.trim()))}>
        <Field data-invalid={said ? true : undefined}>
          <FieldLabel htmlFor={`${id}-code`}>{text.label}</FieldLabel>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              id={`${id}-code`}
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              maxLength={CODE_MAX_LENGTH}
              disabled={pending}
              aria-invalid={said ? true : undefined}
              aria-describedby={said ? `${id}-error` : undefined}
              className="sm:max-w-xs"
              {...field}
            />
            <Button type="submit" variant="outline" disabled={pending} className="shrink-0">
              {pending ? text.submitting : text.submit}
            </Button>
          </div>
          {said ? <FieldError id={`${id}-error`}>{said}</FieldError> : null}
        </Field>
      </form>

      {invoiceOpen ? (
        <p className="flex items-start gap-2 text-sm">
          <TriangleAlertIcon aria-hidden="true" className="text-destructive mt-0.5 size-4 shrink-0" />
          {text.invoiceWarning}
        </p>
      ) : null}
    </section>
  )
}
