"use client"

// React
import { useId } from "react"

// UI
import { Button } from "@harness-monorepo/ui/components/button"
import { Field, FieldDescription, FieldError, FieldLabel } from "@harness-monorepo/ui/components/field"
import { Textarea } from "@harness-monorepo/ui/components/textarea"

// Locales
import { defaultMessages } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import type { AffiliateRecordFormValues, AffiliateRecordIssues, AffiliateTableOption } from "@harness-monorepo/ui/lib/affiliates"
import { AffiliateTableSelect } from "./affiliate-table-select"

export interface AffiliateRecordFormProps {
  value: AffiliateRecordFormValues
  onChange: (value: AffiliateRecordFormValues) => void
  onSubmit: () => void
  tables: readonly AffiliateTableOption[]
  /** An ended affiliate's table no longer pays anything: the table stays shown, and does not change. */
  tableLocked?: boolean
  issues?: AffiliateRecordIssues
  pending?: boolean
  /** Nothing typed differs from what is saved: there is nothing to save. */
  pristine?: boolean
  saved?: boolean
  /** The API's refusal, in words. */
  error?: string
  messages?: UiMessages
}

/** The shop's side of an affiliate (IMPULSEIA-104): the table they are on, and the shop's own note. */
export function AffiliateRecordForm({ value, onChange, onSubmit, tables, tableLocked = false, issues = {}, pending = false, pristine = false, saved = false, error, messages = defaultMessages }: AffiliateRecordFormProps) {
  const text = messages.affiliates.record
  const id = useId()

  return (
    <section aria-labelledby={`${id}-title`} className="bg-shell-surface border-shell-border rounded-xl border p-4 shadow-xs sm:p-6">
      <form
        noValidate
        className="flex flex-col gap-5"
        onSubmit={(event) => {
          event.preventDefault()
          onSubmit()
        }}
      >
        <h2 id={`${id}-title`} className="font-semibold">
          {text.condition}
        </h2>

        <Field data-invalid={issues.tableId ? true : undefined} className="max-w-sm">
          <FieldLabel htmlFor={`${id}-table`}>{text.table}</FieldLabel>
          <AffiliateTableSelect
            id={`${id}-table`}
            tables={tables}
            value={value.tableId}
            disabled={pending || tableLocked}
            invalid={Boolean(issues.tableId)}
            describedBy={`${id}-table-help`}
            onChange={(tableId) => onChange({ ...value, tableId })}
          />
          {issues.tableId ? <FieldError id={`${id}-table-help`}>{issues.tableId}</FieldError> : <FieldDescription id={`${id}-table-help`}>{text.tableHelp}</FieldDescription>}
        </Field>

        <Field data-invalid={issues.note ? true : undefined}>
          <FieldLabel htmlFor={`${id}-note`}>{text.note}</FieldLabel>
          <Textarea
            id={`${id}-note`}
            rows={3}
            value={value.note}
            disabled={pending}
            aria-invalid={issues.note ? true : undefined}
            aria-describedby={`${id}-note-help`}
            onChange={(event) => onChange({ ...value, note: event.target.value })}
          />
          {issues.note ? <FieldError id={`${id}-note-help`}>{issues.note}</FieldError> : <FieldDescription id={`${id}-note-help`}>{text.noteHelp}</FieldDescription>}
        </Field>

        {error ? (
          <p role="alert" className="text-destructive text-sm">
            {error}
          </p>
        ) : null}

        <div className="flex items-center gap-3">
          <Button type="submit" disabled={pending || pristine}>
            {pending ? text.saving : text.save}
          </Button>
          {/* Polite: the save is the person's own act, and the button they pressed is still where they are. */}
          <p role="status" className="text-muted-foreground text-sm">
            {saved && pristine ? text.saved : ""}
          </p>
        </div>
      </form>
    </section>
  )
}
