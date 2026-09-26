"use client"

// UI
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@harness-monorepo/ui/components/alert-dialog"

// Locales
import { defaultMessages } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

export interface DesignConflictDialogProps {
  open: boolean
  onReload: () => void
  messages?: UiMessages
}

/**
 * Another tab wrote to the page this one is editing. The one way on is a reload: this tab's picture
 * of the page is behind, and any write it sent would be refused again. There is no "Cancelar" — the
 * dialog cannot be dismissed into a screen that can no longer save.
 */
export function DesignConflictDialog({ open, onReload, messages = defaultMessages }: DesignConflictDialogProps) {
  const text = messages.design.frame

  return (
    <AlertDialog open={open}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{text.conflictTitle}</AlertDialogTitle>
          <AlertDialogDescription>{text.conflictBody}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction onClick={onReload}>{text.conflictReload}</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
