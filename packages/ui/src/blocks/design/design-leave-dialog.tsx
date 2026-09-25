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

export interface DesignLeaveDialogProps {
  open: boolean
  onStay: () => void
  onLeave: () => void
  messages?: UiMessages
}

/**
 * Asked before the editor is left with an arrangement not yet published. The page's own ways out
 * ask here; closing or reloading the tab is the browser's to ask, since no page may style that one.
 */
export function DesignLeaveDialog({ open, onStay, onLeave, messages = defaultMessages }: DesignLeaveDialogProps) {
  const text = messages.design.frame

  return (
    <AlertDialog open={open} onOpenChange={(next: boolean) => (next ? undefined : onStay())}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{text.leaveTitle}</AlertDialogTitle>
          <AlertDialogDescription>{text.leaveBody}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          {/* Staying keeps the default focus: an Enter must not throw the arrangement away. */}
          <AlertDialogCancel>{text.leaveStay}</AlertDialogCancel>
          <AlertDialogAction onClick={onLeave} className={cn(buttonVariants({ variant: "destructive" }))}>
            {text.leaveGo}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
