"use client"

// UI
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@harness-monorepo/ui/components/alert-dialog"

// Locales
import { format } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import type { CustomerDuplicateView } from "./customer-types"

export interface CustomerMergeDialogProps {
  /** The record the shopkeeper asked to merge with; null with no question open. */
  asking: CustomerDuplicateView | null
  onConfirm: () => void
  onCancel: () => void
  pending: boolean
  /** The merge refused, already in words: said here, where the question was asked. */
  error?: string
  messages: UiMessages
}

/**
 * Asks before two records become one, and says which one stays. The one with an account stays —
 * the API decides that, and this only says it — so "this record" is named by its place, never by a
 * name two records may share. Cancel keeps the default focus: Enter must not merge.
 */
export function CustomerMergeDialog({ asking, onConfirm, onCancel, pending, error, messages }: CustomerMergeDialogProps) {
  const text = messages.customers.record.duplicates
  const name = asking?.name ?? ""

  return (
    <AlertDialog open={asking !== null} onOpenChange={(open: boolean) => (open || pending ? undefined : onCancel())}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{format(text.confirmTitle, { name })}</AlertDialogTitle>
          <AlertDialogDescription>
            {format(asking?.hasAccount ? text.confirmThere : text.confirmHere, { name })} {text.confirmFill}
          </AlertDialogDescription>
        </AlertDialogHeader>
        {error ? (
          <p role="alert" className="text-destructive text-sm">
            {error}
          </p>
        ) : null}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>{text.cancel}</AlertDialogCancel>
          <AlertDialogAction disabled={pending} onClick={onConfirm}>
            {pending ? text.merging : text.confirm}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
