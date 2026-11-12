"use client"

// React
import { useId } from "react"

// UI
import { Button } from "@harness-monorepo/ui/components/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@harness-monorepo/ui/components/dialog"
import { Field, FieldDescription, FieldError, FieldLabel } from "@harness-monorepo/ui/components/field"
import { Textarea } from "@harness-monorepo/ui/components/textarea"

// Locales
import { defaultMessages } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import type { AffiliateOption, OrderAffiliateFormValues, OrderAffiliateIssues } from "@harness-monorepo/ui/lib/affiliate-money"
import { AffiliatePersonSelect } from "./affiliate-person-select"

export interface OrderAffiliateDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  value: OrderAffiliateFormValues
  onChange: (value: OrderAffiliateFormValues) => void
  onSubmit: () => void
  options: readonly AffiliateOption[]
  issues?: OrderAffiliateIssues
  pending?: boolean
  /** The API's refusal, in words. */
  error?: string
  messages?: UiMessages
}

/** Crediting an order to another affiliate, or to nobody, and why (IMPULSEIA-107). */
export function OrderAffiliateDialog({ open, onOpenChange, value, onChange, onSubmit, options, issues = {}, pending = false, error, messages = defaultMessages }: OrderAffiliateDialogProps) {
  const text = messages.affiliates.orderDialog
  const id = useId()
  const hint = `${id}-reason-${issues.reason ? "error" : "help"}`

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

          <Field>
            <FieldLabel htmlFor={`${id}-affiliate`}>{text.affiliate}</FieldLabel>
            <AffiliatePersonSelect id={`${id}-affiliate`} options={options} value={value.affiliateId} nobodyLabel={text.nobody} disabled={pending} onChange={(affiliateId) => onChange({ ...value, affiliateId })} />
          </Field>

          <Field data-invalid={issues.reason ? true : undefined}>
            <FieldLabel htmlFor={`${id}-reason`}>{text.reason}</FieldLabel>
            <Textarea id={`${id}-reason`} rows={3} value={value.reason} disabled={pending} aria-invalid={issues.reason ? true : undefined} aria-describedby={hint} onChange={(event) => onChange({ ...value, reason: event.target.value })} />
            {issues.reason ? <FieldError id={hint}>{issues.reason}</FieldError> : <FieldDescription id={hint}>{text.reasonHelp}</FieldDescription>}
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
