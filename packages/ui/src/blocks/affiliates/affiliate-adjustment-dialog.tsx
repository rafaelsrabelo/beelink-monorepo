"use client"

// React
import { useId } from "react"

// UI
import { Button } from "@harness-monorepo/ui/components/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@harness-monorepo/ui/components/dialog"
import { Field, FieldDescription, FieldError, FieldLabel, FieldLegend, FieldSet } from "@harness-monorepo/ui/components/field"
import { Input } from "@harness-monorepo/ui/components/input"
import { RadioGroup, RadioGroupItem } from "@harness-monorepo/ui/components/radio-group"
import { Textarea } from "@harness-monorepo/ui/components/textarea"

// Locales
import { defaultMessages } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import type { AffiliateAdjustmentFormValues, AffiliateAdjustmentIssues } from "@harness-monorepo/ui/lib/affiliate-money"

export interface AffiliateAdjustmentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  value: AffiliateAdjustmentFormValues
  onChange: (value: AffiliateAdjustmentFormValues) => void
  onSubmit: () => void
  issues?: AffiliateAdjustmentIssues
  pending?: boolean
  /** The API's refusal, in words. */
  error?: string
  messages?: UiMessages
}

const DIRECTIONS = ["credit", "debit"] as const

/** The shop's correction of what it owes an affiliate, either way, with the reason they read too (IMPULSEIA-107). */
export function AffiliateAdjustmentDialog({ open, onOpenChange, value, onChange, onSubmit, issues = {}, pending = false, error, messages = defaultMessages }: AffiliateAdjustmentDialogProps) {
  const text = messages.affiliates.adjustDialog
  const id = useId()
  const reasonHint = `${id}-reason-${issues.reason ? "error" : "help"}`

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

          <FieldSet>
            <FieldLegend id={`${id}-direction`}>{text.direction}</FieldLegend>
            <RadioGroup value={value.direction} onValueChange={(next) => onChange({ ...value, direction: next === "debit" ? "debit" : "credit" })} disabled={pending} aria-labelledby={`${id}-direction`} className="flex gap-4">
              {DIRECTIONS.map((direction) => (
                <Field key={direction} orientation="horizontal">
                  <RadioGroupItem id={`${id}-${direction}`} value={direction} />
                  <FieldLabel htmlFor={`${id}-${direction}`} className="font-normal">
                    {text[direction]}
                  </FieldLabel>
                </Field>
              ))}
            </RadioGroup>
          </FieldSet>

          <Field data-invalid={issues.amount ? true : undefined}>
            <FieldLabel htmlFor={`${id}-amount`}>{text.amount}</FieldLabel>
            <Input id={`${id}-amount`} inputMode="decimal" autoComplete="off" value={value.amount} disabled={pending} aria-invalid={issues.amount ? true : undefined} onChange={(event) => onChange({ ...value, amount: event.target.value })} />
            <FieldError>{issues.amount}</FieldError>
          </Field>

          <Field data-invalid={issues.reason ? true : undefined}>
            <FieldLabel htmlFor={`${id}-reason`}>{text.reason}</FieldLabel>
            <Textarea id={`${id}-reason`} rows={3} value={value.reason} disabled={pending} aria-invalid={issues.reason ? true : undefined} aria-describedby={reasonHint} onChange={(event) => onChange({ ...value, reason: event.target.value })} />
            {issues.reason ? <FieldError id={reasonHint}>{issues.reason}</FieldError> : <FieldDescription id={reasonHint}>{text.reasonHelp}</FieldDescription>}
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
