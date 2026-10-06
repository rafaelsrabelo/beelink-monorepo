"use client"

// React
import { useState } from "react"

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
import { defaultMessages, format } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

export interface TemplateApplyDialogProps {
  /** The model about to be applied, by the name its card carries. Null means nothing is being asked. */
  templateName: string | null
  /** The page whose draft it replaces, as the editor's bar names it. */
  pageName: string
  /** Whether the draft holds changes the shop does not serve yet: they go with the draft, and the dialog says so. */
  unpublished: boolean
  onConfirm: () => void
  onCancel: () => void
  applying?: boolean
  /** Why the API refused, in the owner's words. The dialog stays open on it. */
  error?: string | null
  messages?: UiMessages
}

/**
 * The question before a model replaces a page's draft: what goes, and what does not — the shop a
 * visitor is served stays as it is until Publicar.
 *
 * Its own dialog rather than `ConfirmDelete`: nothing is deleted from the shop here, and that one
 * asks "Excluir?" in a destructive button.
 */
export function TemplateApplyDialog({
  templateName,
  pageName,
  unpublished,
  onConfirm,
  onCancel,
  applying = false,
  error = null,
  messages = defaultMessages,
}: TemplateApplyDialogProps) {
  const text = messages.design.templateApply
  // The last model asked about, kept while the dialog fades out: its title must not lose the name on the way.
  const [named, setNamed] = useState(templateName)
  if (templateName !== null && templateName !== named) setNamed(templateName)

  return (
    // While the write is out the dialog stays: closing it would lose the answer's place to be said.
    <AlertDialog open={templateName !== null} onOpenChange={(open: boolean) => (open || applying ? undefined : onCancel())}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{format(text.title, { name: named ?? "" })}</AlertDialogTitle>
          <AlertDialogDescription>{format(text.replaces, { page: pageName })}</AlertDialogDescription>
        </AlertDialogHeader>
        <div className="text-muted-foreground flex flex-col gap-2 text-sm">
          <p>{text.shopUnchanged}</p>
          {unpublished ? <p className="text-foreground font-medium">{text.unpublishedLost}</p> : null}
        </div>
        {error ? (
          <p role="alert" className="text-destructive text-sm">
            {error}
          </p>
        ) : null}
        <AlertDialogFooter>
          {/* Cancel keeps the default focus: an Enter on a question about replacing a draft must not replace it. */}
          <AlertDialogCancel disabled={applying}>{text.cancel}</AlertDialogCancel>
          <AlertDialogAction disabled={applying} onClick={onConfirm}>
            {applying ? text.applying : text.confirm}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
