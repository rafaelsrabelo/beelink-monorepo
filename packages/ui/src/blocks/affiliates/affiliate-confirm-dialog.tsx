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

export interface AffiliateConfirmText {
  title: string
  question: string
  detail: string
  confirm: string
  confirming: string
}

export interface AffiliateConfirmDialogProps {
  /** Null means nothing is asked. The sentences arrive written: cancelling an invite and ending a standing say different things. */
  text: AffiliateConfirmText | null
  keepLabel: string
  onConfirm: () => void
  onCancel: () => void
  pending?: boolean
}

/**
 * The question before an act on an affiliate that does not come back (IMPULSEIA-104): an invite
 * cancelled, a standing ended. Not the shared delete dialog, which says "Excluir" — ending is not.
 */
export function AffiliateConfirmDialog({ text, keepLabel, onConfirm, onCancel, pending = false }: AffiliateConfirmDialogProps) {
  return (
    <AlertDialog open={text !== null} onOpenChange={(open: boolean) => (open ? undefined : onCancel())}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{text?.title}</AlertDialogTitle>
          <AlertDialogDescription>{text?.question}</AlertDialogDescription>
        </AlertDialogHeader>
        <p className="text-muted-foreground text-sm">{text?.detail}</p>
        <AlertDialogFooter>
          {/* Keeping holds the default focus: Enter on a question about ending something must not end it. */}
          <AlertDialogCancel disabled={pending}>{keepLabel}</AlertDialogCancel>
          <AlertDialogAction disabled={pending} onClick={onConfirm} className={cn(buttonVariants({ variant: "destructive" }))}>
            {pending ? text?.confirming : text?.confirm}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
