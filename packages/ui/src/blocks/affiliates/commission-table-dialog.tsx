"use client"

// React
import { useId } from "react"

// UI
import { Button } from "@harness-monorepo/ui/components/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@harness-monorepo/ui/components/dialog"
import { Field, FieldDescription, FieldError, FieldLabel } from "@harness-monorepo/ui/components/field"
import { Input } from "@harness-monorepo/ui/components/input"

// Locales
import { defaultMessages } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import type { CommissionTableFormValues, CommissionTableIssues } from "@harness-monorepo/ui/lib/affiliates"

export interface CommissionTableDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** A new table, or one that exists. */
  mode: "create" | "edit"
  value: CommissionTableFormValues
  onChange: (value: CommissionTableFormValues) => void
  onSubmit: () => void
  issues?: CommissionTableIssues
  pending?: boolean
  /** The API's refusal, in words. */
  error?: string
  messages?: UiMessages
}

/** A commission table's name and the rate every product pays on it (IMPULSEIA-102), created or changed. */
export function CommissionTableDialog({ open, onOpenChange, mode, value, onChange, onSubmit, issues = {}, pending = false, error, messages = defaultMessages }: CommissionTableDialogProps) {
  const text = messages.affiliates.tables.dialog
  const id = useId()

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
            <DialogTitle>{mode === "create" ? text.createTitle : text.editTitle}</DialogTitle>
            <DialogDescription>{text.description}</DialogDescription>
          </DialogHeader>

          <Field data-invalid={issues.name ? true : undefined}>
            <FieldLabel htmlFor={`${id}-name`}>{text.name}</FieldLabel>
            <Input
              id={`${id}-name`}
              autoComplete="off"
              placeholder="Influencers"
              value={value.name}
              disabled={pending}
              aria-invalid={issues.name ? true : undefined}
              onChange={(event) => onChange({ ...value, name: event.target.value })}
            />
            <FieldError>{issues.name}</FieldError>
          </Field>

          <Field data-invalid={issues.rate ? true : undefined} className="max-w-64">
            <FieldLabel htmlFor={`${id}-rate`}>{text.rate}</FieldLabel>
            <Input
              id={`${id}-rate`}
              inputMode="decimal"
              autoComplete="off"
              placeholder="10"
              value={value.rate}
              disabled={pending}
              aria-invalid={issues.rate ? true : undefined}
              aria-describedby={`${id}-rate-${issues.rate ? "error" : "help"}`}
              onChange={(event) => onChange({ ...value, rate: event.target.value })}
            />
            {issues.rate ? <FieldError id={`${id}-rate-error`}>{issues.rate}</FieldError> : <FieldDescription id={`${id}-rate-help`}>{text.rateHelp}</FieldDescription>}
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
              {pending ? text.saving : mode === "create" ? text.create : text.save}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
