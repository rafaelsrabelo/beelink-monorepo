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
import { buttonVariants } from "@harness-monorepo/ui/components/button"
import { cn } from "@harness-monorepo/ui/lib/utils"

// Locales
import { defaultMessages } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

export interface ProductLeaveDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Leaving throws the draft away. */
  onLeave: () => void
  messages?: UiMessages
}

/** "Sair sem salvar?" — the product editor's question before Cancel throws an unsaved draft away. */
export function ProductLeaveDialog({ open, onOpenChange, onLeave, messages = defaultMessages }: ProductLeaveDialogProps) {
  const text = messages.catalog.products

  return (
    <AlertDialog open={open} onOpenChange={(next: boolean) => onOpenChange(next)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{text.leaveTitle}</AlertDialogTitle>
          <AlertDialogDescription>{text.leaveBody}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          {/* Staying keeps the default focus: Enter on this question must not lose the edit. */}
          <AlertDialogCancel>{text.keepEditing}</AlertDialogCancel>
          <AlertDialogAction className={cn(buttonVariants({ variant: "destructive" }))} onClick={onLeave}>
            {text.leaveConfirm}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
