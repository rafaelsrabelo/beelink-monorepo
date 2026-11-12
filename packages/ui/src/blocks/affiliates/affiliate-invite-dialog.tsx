"use client"

// React
import { useId } from "react"

// UI
import { Button } from "@harness-monorepo/ui/components/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@harness-monorepo/ui/components/dialog"
import { Field, FieldDescription, FieldError, FieldLabel } from "@harness-monorepo/ui/components/field"
import { Input } from "@harness-monorepo/ui/components/input"
import { Textarea } from "@harness-monorepo/ui/components/textarea"

// Locales
import { defaultMessages } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import type { AffiliateInviteFormValues, AffiliateInviteIssues, AffiliateTableOption } from "@harness-monorepo/ui/lib/affiliates"
import { AffiliateTableSelect } from "./affiliate-table-select"

export interface AffiliateInviteDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  value: AffiliateInviteFormValues
  onChange: (value: AffiliateInviteFormValues) => void
  onSubmit: () => void
  tables: readonly AffiliateTableOption[]
  issues?: AffiliateInviteIssues
  pending?: boolean
  /** The API's refusal, in words. */
  error?: string
  messages?: UiMessages
}

/** Inviting someone to sell for the shop (IMPULSEIA-104): who, at which e-mail, on which table. */
export function AffiliateInviteDialog({ open, onOpenChange, value, onChange, onSubmit, tables, issues = {}, pending = false, error, messages = defaultMessages }: AffiliateInviteDialogProps) {
  const text = messages.affiliates.inviteDialog
  const id = useId()
  const hint = (field: keyof AffiliateInviteIssues) => `${id}-${field}-${issues[field] ? "error" : "help"}`

  return (
    <Dialog open={open} onOpenChange={(next: boolean) => onOpenChange(next)}>
      <DialogContent closeLabel={text.cancel} className="sm:max-w-lg">
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

          <Field data-invalid={issues.name ? true : undefined}>
            <FieldLabel htmlFor={`${id}-name`}>{text.name}</FieldLabel>
            <Input id={`${id}-name`} autoComplete="off" value={value.name} disabled={pending} aria-invalid={issues.name ? true : undefined} onChange={(event) => onChange({ ...value, name: event.target.value })} />
            <FieldError>{issues.name}</FieldError>
          </Field>

          <Field data-invalid={issues.email ? true : undefined}>
            <FieldLabel htmlFor={`${id}-email`}>{text.email}</FieldLabel>
            <Input
              id={`${id}-email`}
              type="email"
              autoComplete="off"
              value={value.email}
              disabled={pending}
              aria-invalid={issues.email ? true : undefined}
              aria-describedby={hint("email")}
              onChange={(event) => onChange({ ...value, email: event.target.value })}
            />
            {issues.email ? <FieldError id={hint("email")}>{issues.email}</FieldError> : <FieldDescription id={hint("email")}>{text.emailHelp}</FieldDescription>}
          </Field>

          <Field data-invalid={issues.tableId ? true : undefined}>
            <FieldLabel htmlFor={`${id}-table`}>{text.table}</FieldLabel>
            <AffiliateTableSelect id={`${id}-table`} tables={tables} value={value.tableId} disabled={pending} invalid={Boolean(issues.tableId)} describedBy={hint("tableId")} onChange={(tableId) => onChange({ ...value, tableId })} />
            {issues.tableId ? <FieldError id={hint("tableId")}>{issues.tableId}</FieldError> : <FieldDescription id={hint("tableId")}>{text.tableHelp}</FieldDescription>}
          </Field>

          <Field data-invalid={issues.phone ? true : undefined}>
            <FieldLabel htmlFor={`${id}-phone`}>{text.phone}</FieldLabel>
            <Input
              id={`${id}-phone`}
              type="tel"
              inputMode="tel"
              autoComplete="off"
              value={value.phone}
              disabled={pending}
              aria-invalid={issues.phone ? true : undefined}
              aria-describedby={hint("phone")}
              onChange={(event) => onChange({ ...value, phone: event.target.value })}
            />
            {issues.phone ? <FieldError id={hint("phone")}>{issues.phone}</FieldError> : <FieldDescription id={hint("phone")}>{text.phoneHelp}</FieldDescription>}
          </Field>

          <Field data-invalid={issues.note ? true : undefined}>
            <FieldLabel htmlFor={`${id}-note`}>{text.note}</FieldLabel>
            <Textarea
              id={`${id}-note`}
              rows={3}
              value={value.note}
              disabled={pending}
              aria-invalid={issues.note ? true : undefined}
              aria-describedby={hint("note")}
              onChange={(event) => onChange({ ...value, note: event.target.value })}
            />
            {issues.note ? <FieldError id={hint("note")}>{issues.note}</FieldError> : <FieldDescription id={hint("note")}>{text.noteHelp}</FieldDescription>}
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
