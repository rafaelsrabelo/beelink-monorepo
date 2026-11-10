"use client"

// Libs
import { BellRingIcon } from "lucide-react"

// UI
import { AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@harness-monorepo/ui/components/alert-dialog"

// Locales
import { defaultMessages } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

export interface GestorStartProps {
  open: boolean
  onStart: () => void
  messages?: UiMessages
}

/**
 * The tap the manager opens with. A browser plays no sound a page did not get a tap for, and keeps
 * no screen awake for one either: this is that tap, said as what it is for — the bell.
 */
export function GestorStart({ open, onStart, messages = defaultMessages }: GestorStartProps) {
  const text = messages.gestor.start

  return (
    <AlertDialog open={open}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <span aria-hidden="true" className="bg-header text-header-foreground mb-1 flex size-12 items-center justify-center rounded-full">
            <BellRingIcon className="size-6" />
          </span>
          <AlertDialogTitle>{text.title}</AlertDialogTitle>
          <AlertDialogDescription>{text.text}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction className="h-11 px-6 text-base font-semibold" onClick={onStart}>
            {text.action}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
