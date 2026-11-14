"use client"

// React
import { useId } from "react"

// UI
import { Button } from "@harness-monorepo/ui/components/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@harness-monorepo/ui/components/dialog"
import { Field, FieldLabel } from "@harness-monorepo/ui/components/field"

// Locales
import { defaultMessages, format } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import type { AffiliateApplicationView } from "@harness-monorepo/ui/lib/affiliate-page"
import type { AffiliateTableOption } from "@harness-monorepo/ui/lib/affiliates"
import { AffiliateTableSelect } from "./affiliate-table-select"

export interface AffiliateApplicationApproveDialogProps {
  /** Null means nothing is being approved. */
  application: AffiliateApplicationView | null
  tables: readonly AffiliateTableOption[]
  tableId: string
  onTableChange: (tableId: string) => void
  onConfirm: () => void
  onCancel: () => void
  pending?: boolean
  /** The API's refusal, in words. */
  error?: string
  messages?: UiMessages
}

/**
 * The question before an approval (plan 2026-11-14): to whom the invite goes, and on which of the
 * shop's tables — the one the page announces to begin with.
 */
export function AffiliateApplicationApproveDialog({ application, tables, tableId, onTableChange, onConfirm, onCancel, pending = false, error, messages = defaultMessages }: AffiliateApplicationApproveDialogProps) {
  const text = messages.affiliateApplications.approveDialog
  const id = useId()

  return (
    <Dialog open={application !== null} onOpenChange={(open: boolean) => (open ? undefined : onCancel())}>
      <DialogContent closeLabel={text.cancel} className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{format(text.title, { name: application?.name ?? "" })}</DialogTitle>
          <DialogDescription>{format(text.body, { email: application?.email ?? "" })}</DialogDescription>
        </DialogHeader>
        <Field>
          <FieldLabel htmlFor={`${id}-table`}>{text.table}</FieldLabel>
          <AffiliateTableSelect id={`${id}-table`} tables={tables} value={tableId} onChange={onTableChange} disabled={pending} />
        </Field>
        {error ? (
          <p role="alert" className="text-destructive text-sm">
            {error}
          </p>
        ) : null}
        <DialogFooter>
          <Button type="button" variant="outline" disabled={pending} onClick={onCancel}>
            {text.cancel}
          </Button>
          <Button type="button" disabled={pending} onClick={onConfirm}>
            {pending ? text.sending : text.confirm}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
