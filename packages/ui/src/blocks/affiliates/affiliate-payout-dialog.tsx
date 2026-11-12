"use client"

// React
import { useId } from "react"

// UI
import { Button } from "@harness-monorepo/ui/components/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@harness-monorepo/ui/components/dialog"
import { Field, FieldDescription, FieldError, FieldLabel } from "@harness-monorepo/ui/components/field"
import { Input } from "@harness-monorepo/ui/components/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@harness-monorepo/ui/components/select"
import { Textarea } from "@harness-monorepo/ui/components/textarea"

// Locales
import { defaultMessages, format } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import type { AffiliatePayoutFormValues, AffiliatePayoutIssues, AffiliatePayoutMethodValue } from "@harness-monorepo/ui/lib/affiliate-money"

export interface AffiliatePayoutDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  value: AffiliatePayoutFormValues
  onChange: (value: AffiliatePayoutFormValues) => void
  onSubmit: () => void
  /** What is available, in words. */
  available: string
  /** The latest day it may be dated, `YYYY-MM-DD`: today. */
  maxDay: string
  pixKey: string | null
  issues?: AffiliatePayoutIssues
  pending?: boolean
  /** The API's refusal, in words. */
  error?: string
  messages?: UiMessages
}

const METHODS = ["PIX", "TRANSFER", "CASH"] as const satisfies readonly AffiliatePayoutMethodValue[]

/** A payment the shop made to an affiliate outside bee-link, recorded (IMPULSEIA-107): nothing moves here. */
export function AffiliatePayoutDialog({ open, onOpenChange, value, onChange, onSubmit, available, maxDay, pixKey, issues = {}, pending = false, error, messages = defaultMessages }: AffiliatePayoutDialogProps) {
  const text = messages.affiliates.payoutDialog
  const methods = messages.affiliates.money.methods
  const id = useId()
  const amountHint = `${id}-amount-${issues.amount ? "error" : "help"}`
  const noteHint = `${id}-note-${issues.note ? "error" : "help"}`

  return (
    <Dialog open={open} onOpenChange={(next: boolean) => onOpenChange(next)}>
      <DialogContent closeLabel={text.cancel} className="sm:max-w-md">
        <form
          noValidate
          className="flex flex-col gap-5"
          onSubmit={(event) => {
            event.preventDefault()
            onSubmit()
          }}
        >
          <DialogHeader>
            <DialogTitle>{text.title}</DialogTitle>
            <DialogDescription>{text.description}</DialogDescription>
          </DialogHeader>

          <p className="bg-muted rounded-md p-2 text-sm">{pixKey ? format(text.pixKey, { key: pixKey }) : text.pixKeyNone}</p>

          <Field data-invalid={issues.amount ? true : undefined}>
            <FieldLabel htmlFor={`${id}-amount`}>{text.amount}</FieldLabel>
            <Input id={`${id}-amount`} inputMode="decimal" autoComplete="off" value={value.amount} disabled={pending} aria-invalid={issues.amount ? true : undefined} aria-describedby={amountHint} onChange={(event) => onChange({ ...value, amount: event.target.value })} />
            {issues.amount ? <FieldError id={amountHint}>{issues.amount}</FieldError> : <FieldDescription id={amountHint}>{format(text.amountHelp, { amount: available })}</FieldDescription>}
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field data-invalid={issues.paidOn ? true : undefined}>
              <FieldLabel htmlFor={`${id}-day`}>{text.paidOn}</FieldLabel>
              <Input id={`${id}-day`} type="date" max={maxDay} value={value.paidOn} disabled={pending} aria-invalid={issues.paidOn ? true : undefined} onChange={(event) => onChange({ ...value, paidOn: event.target.value })} />
              <FieldError>{issues.paidOn}</FieldError>
            </Field>
            <Field>
              <FieldLabel htmlFor={`${id}-method`}>{text.method}</FieldLabel>
              <Select value={value.method} onValueChange={(next: unknown) => onChange({ ...value, method: METHODS.find((method) => method === next) ?? "PIX" })} disabled={pending}>
                <SelectTrigger id={`${id}-method`} className="w-full">
                  <SelectValue>{(selected: AffiliatePayoutMethodValue) => methods[selected]}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {METHODS.map((method) => (
                    <SelectItem key={method} value={method}>
                      {methods[method]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>

          <Field data-invalid={issues.note ? true : undefined}>
            <FieldLabel htmlFor={`${id}-note`}>{text.note}</FieldLabel>
            <Textarea id={`${id}-note`} rows={2} value={value.note} disabled={pending} aria-invalid={issues.note ? true : undefined} aria-describedby={noteHint} onChange={(event) => onChange({ ...value, note: event.target.value })} />
            {issues.note ? <FieldError id={noteHint}>{issues.note}</FieldError> : <FieldDescription id={noteHint}>{text.noteHelp}</FieldDescription>}
          </Field>

          {error ? (
            <p role="alert" className="text-destructive text-sm">
              {error}
            </p>
          ) : null}

          <DialogFooter>
            <Button type="button" variant="ghost" disabled={pending} onClick={() => onOpenChange(false)}>
              {text.cancel}
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? text.submitting : text.submit}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
