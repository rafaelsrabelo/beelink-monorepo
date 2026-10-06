"use client"

// React
import { useId, useState, type FormEvent } from "react"

// Libs
import { ArrowLeftIcon } from "lucide-react"

// UI
import { Button } from "@harness-monorepo/ui/components/button"
import { Field, FieldDescription, FieldLabel } from "@harness-monorepo/ui/components/field"
import { Input } from "@harness-monorepo/ui/components/input"
import { Textarea } from "@harness-monorepo/ui/components/textarea"
import { centsFromStrict, reaisFrom } from "@harness-monorepo/ui/lib/money"

// Locales
import { defaultLocale, defaultMessages, format } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import { AnchorLink, type LinkComponent } from "../auth/auth-link"
import { formatCents } from "../storefront/storefront-price"

/** What the API takes as a reason. */
export const REFUND_REASON_MIN = 3
export const REFUND_REASON_MAX = 300

/** What is refunded: the order's own payment, with or without the order's cancellation, or money it did not ask for. */
export type OrderRefundKind = "payment" | "cancel" | "stray"

export interface OrderRefundFormProps {
  number: number
  kind: OrderRefundKind
  method: "PIX" | "CREDIT_CARD"
  /** The charge refunded, and what of it already went back or is on its way. Whole cents. */
  paidCents: number
  refundedCents: number
  refundingCents: number
  /** What this refund may ask for at most; zero, and there is nothing to ask. */
  refundableCents: number
  backHref: string
  onSubmit: (refund: { amountCents: number; reason: string }) => void
  pending?: boolean
  /** Why the last try did not go through, in words. */
  error?: string | null
  locale?: string
  currency?: string
  linkComponent?: LinkComponent
  messages?: UiMessages
}

/**
 * Giving money back from an order (BEELINK-208): how much — all that is left, unless the shop types
 * less — and why, with what happens next said before the button: a card takes days, a Pix needs the
 * balance, and a cancellation only goes through once Asaas took the refund. A cancellation always
 * gives back all that is left, so its amount is not a field.
 */
export function OrderRefundForm({
  number,
  kind,
  method,
  paidCents,
  refundedCents,
  refundingCents,
  refundableCents,
  backHref,
  onSubmit,
  pending = false,
  error,
  locale = defaultLocale,
  currency = "BRL",
  linkComponent: Link = AnchorLink,
  messages = defaultMessages,
}: OrderRefundFormProps) {
  const text = messages.orders.detail.refund
  const id = useId()
  const money = (cents: number) => formatCents(cents, locale, currency)
  const [amount, setAmount] = useState(() => reaisFrom(refundableCents))
  const [reason, setReason] = useState("")
  const [invalid, setInvalid] = useState<{ amount?: string; reason?: string }>({})

  const whole = kind === "cancel"
  // Only what has one reading: a refund guessed at is money gone.
  const typed = whole ? refundableCents : centsFromStrict(amount)
  const title = kind === "cancel" ? text.cancelTitle : kind === "stray" ? text.strayTitle : text.title

  function submit(event: FormEvent) {
    event.preventDefault()
    // The button stays focusable while it is sent, so Enter could send it twice.
    if (pending) return
    const trimmed = reason.trim()
    const problems = {
      amount: typed === null || typed < 1 ? text.amountRequired : typed > refundableCents ? format(text.amountTooMuch, { amount: money(refundableCents) }) : undefined,
      reason: trimmed.length < REFUND_REASON_MIN ? text.reasonRequired : undefined,
    }
    setInvalid(problems)
    if (!problems.amount && !problems.reason && typed !== null) onSubmit({ amountCents: typed, reason: trimmed })
  }

  const facts = [
    { label: text.paid, cents: paidCents, show: true },
    { label: text.refunded, cents: refundedCents, show: refundedCents > 0 },
    { label: text.refunding, cents: refundingCents, show: refundingCents > 0 },
    { label: text.left, cents: refundableCents, show: true },
  ]

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-3">
        <Link href={backHref} className="text-muted-foreground hover:text-foreground focus-visible:ring-ring inline-flex w-fit items-center gap-1 rounded-sm text-sm outline-none focus-visible:ring-2">
          <ArrowLeftIcon aria-hidden="true" className="size-4" />
          {text.back}
        </Link>
        <h1 className="text-2xl font-semibold">{format(title, { number: String(number) })}</h1>
      </header>

      <dl className="bg-shell-surface border-shell-border flex flex-col gap-2 rounded-xl border p-4 shadow-xs">
        {facts
          .filter((fact) => fact.show)
          .map((fact) => (
            <div key={fact.label} className="flex items-baseline justify-between gap-3">
              <dt className="text-muted-foreground text-sm">{fact.label}</dt>
              <dd className="text-sm font-medium tabular-nums">{money(fact.cents)}</dd>
            </div>
          ))}
      </dl>

      {refundableCents < 1 ? (
        <p className="text-muted-foreground text-sm">{text.nothing}</p>
      ) : (
        <form onSubmit={submit} noValidate className="flex flex-col gap-4">
          {whole ? null : (
            <Field data-invalid={invalid.amount ? true : undefined}>
              <FieldLabel htmlFor={`${id}-amount`}>{text.amount}</FieldLabel>
              <Input
                id={`${id}-amount`}
                inputMode="decimal"
                placeholder="0,00"
                className="max-w-48"
                value={amount}
                aria-invalid={invalid.amount ? true : undefined}
                aria-describedby={`${id}-amount-hint`}
                onChange={(event) => {
                  setAmount(event.target.value)
                  setInvalid((current) => ({ ...current, amount: undefined }))
                }}
              />
              <FieldDescription id={`${id}-amount-hint`} className={invalid.amount ? "text-destructive" : undefined}>
                {invalid.amount ?? format(text.amountHint, { amount: money(refundableCents) })}
              </FieldDescription>
            </Field>
          )}

          <Field data-invalid={invalid.reason ? true : undefined}>
            <FieldLabel htmlFor={`${id}-reason`}>{text.reason}</FieldLabel>
            <Textarea
              id={`${id}-reason`}
              rows={3}
              maxLength={REFUND_REASON_MAX}
              value={reason}
              aria-invalid={invalid.reason ? true : undefined}
              aria-describedby={`${id}-reason-hint`}
              onChange={(event) => {
                setReason(event.target.value)
                setInvalid((current) => ({ ...current, reason: undefined }))
              }}
            />
            <FieldDescription id={`${id}-reason-hint`} className={invalid.reason ? "text-destructive" : undefined}>
              {invalid.reason ?? text.reasonHint}
            </FieldDescription>
          </Field>

          <ul className="text-muted-foreground flex list-disc flex-col gap-1 pl-5 text-sm">
            <li>{method === "CREDIT_CARD" ? text.cardNote : text.pixNote}</li>
            {whole ? <li>{text.cancelNote}</li> : null}
          </ul>

          {error ? (
            <p role="alert" className="text-destructive text-sm break-words">
              {error}
            </p>
          ) : null}

          <div>
            <Button type="submit" variant="destructive" disabled={pending} focusableWhenDisabled>
              {pending ? text.submitting : format(whole ? text.submitCancel : text.submit, { amount: money(typed !== null && typed > 0 && typed <= refundableCents ? typed : refundableCents) })}
            </Button>
          </div>
        </form>
      )}
    </div>
  )
}
