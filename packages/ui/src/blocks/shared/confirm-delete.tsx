"use client"

// React
import type { ReactNode } from "react"

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
import { buttonVariants } from "@harness-monorepo/ui/components/button"
import { cn } from "@harness-monorepo/ui/lib/utils"

// Locales
import { defaultMessages } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

export interface ConfirmDeleteProps {
  /** What is about to go, in the shopkeeper's own words. Null means nothing is pending. */
  question: string | null
  onConfirm: () => void
  onCancel: () => void
  pending?: boolean
  /** Said under the question when the delete takes something else with it. */
  detail?: ReactNode
  messages?: UiMessages
}

/**
 * The one dialog that asks before something is destroyed.
 *
 * It replaces `window.confirm`, which four screens used. That one cannot be styled, cannot be
 * translated, is dismissed for the rest of a session by a browser's own "prevent this page from
 * creating more dialogs" — after which a delete happens with no question asked at all.
 *
 * The question arrives already written rather than built here. Which sentence to ask is the
 * screen's to choose: deleting a category takes its subcategories with it and deleting a block
 * does not, and a dialog that composed its own sentence would have to learn every one of those.
 */
export function ConfirmDelete({
  question,
  onConfirm,
  onCancel,
  pending = false,
  detail,
  messages = defaultMessages,
}: ConfirmDeleteProps) {
  const text = messages.shared

  return (
    <AlertDialog open={!!question} onOpenChange={(open: boolean) => (open ? undefined : onCancel())}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{text.confirmDeleteTitle}</AlertDialogTitle>
          <AlertDialogDescription>{question}</AlertDialogDescription>
        </AlertDialogHeader>
        {detail ? <div className="text-muted-foreground text-sm">{detail}</div> : null}
        <AlertDialogFooter>
          {/*
            Cancel keeps the default focus: a keyboard Enter on a question about deleting something
            must not delete it.
          */}
          <AlertDialogCancel disabled={pending}>{text.cancel}</AlertDialogCancel>
          <AlertDialogAction
            disabled={pending}
            onClick={onConfirm}
            className={cn(buttonVariants({ variant: "destructive" }))}
          >
            {pending ? text.deleting : text.delete}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
