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
import { Button, buttonVariants } from "@harness-monorepo/ui/components/button"
import { cn } from "@harness-monorepo/ui/lib/utils"

// Locales
import { defaultMessages } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

export interface ProductOrderFooterProps {
  /** The order on screen is not the one saved. */
  dirty: boolean
  pending?: boolean
  /** The last save went through and nothing moved since. */
  saved?: boolean
  /** Ready-made by the screen: this package never sees an `errorCode`. */
  error?: string | undefined
  onSave: () => void
  onUndo: () => void
  /** A way out was taken with the order unsaved, and the screen is waiting for an answer. */
  leaving?: boolean
  onStay?: () => void
  onLeave?: () => void
  messages?: UiMessages
}

/**
 * Saving the order, and the question before leaving without it.
 *
 * Sticky, because the list is the whole catalogue: a button below three hundred rows is a button
 * nobody finds after moving the first one.
 */
export function ProductOrderFooter({
  dirty,
  pending = false,
  saved = false,
  error,
  onSave,
  onUndo,
  leaving = false,
  onStay,
  onLeave,
  messages = defaultMessages,
}: ProductOrderFooterProps) {
  const text = messages.catalog.products.order

  return (
    <>
      <div className="bg-shell-content sticky bottom-0 z-20 flex flex-wrap items-center justify-end gap-2 border-t py-3">
        {/* A refusal outranks "not saved yet", which it would otherwise only repeat. */}
        <div className="mr-auto min-w-0 basis-full text-sm sm:basis-0 sm:flex-1" aria-live="polite">
          {error ? (
            <p role="alert" className="text-destructive">
              {error}
            </p>
          ) : dirty ? (
            <p className="text-muted-foreground">{text.unsaved}</p>
          ) : saved ? (
            <p className="text-muted-foreground">{text.saved}</p>
          ) : null}
        </div>
        <Button type="button" variant="ghost" disabled={!dirty || pending} onClick={onUndo}>
          {text.undo}
        </Button>
        <Button type="button" disabled={!dirty || pending} onClick={onSave}>
          {pending ? text.saving : text.save}
        </Button>
      </div>

      <AlertDialog open={leaving} onOpenChange={(open: boolean) => (open ? undefined : onStay?.())}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{text.leaveTitle}</AlertDialogTitle>
            <AlertDialogDescription>{text.leaveBody}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            {/* Staying keeps the default focus: Enter on this question must not lose the order. */}
            <AlertDialogCancel>{text.leaveStay}</AlertDialogCancel>
            <AlertDialogAction className={cn(buttonVariants({ variant: "destructive" }))} onClick={onLeave}>
              {text.leaveGo}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
