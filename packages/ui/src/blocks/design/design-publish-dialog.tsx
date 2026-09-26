"use client"

// UI
import { Button } from "@harness-monorepo/ui/components/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@harness-monorepo/ui/components/dialog"
import { Field, FieldLabel } from "@harness-monorepo/ui/components/field"
import { Skeleton } from "@harness-monorepo/ui/components/skeleton"
import { Textarea } from "@harness-monorepo/ui/components/textarea"

// Locales
import { defaultMessages, format } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import type { DesignPublishProblemKind } from "./design-types"

/** One problem, already named by the screen: which block, in which band. */
export interface DesignPublishProblem {
  kind: DesignPublishProblemKind
  blockName: string
  bandName: string
}

export interface DesignPublishDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  pageName: string
  /** What the draft would serve that the owner may not mean. Null while it is being checked. */
  problems: readonly DesignPublishProblem[] | null
  /** The check did not answer. Publicar stays open: the check warns, it never stops a publish. */
  checkFailed?: boolean
  onRetryCheck?: () => void
  note: string
  onNoteChange: (note: string) => void
  onPublish: () => void
  publishing: boolean
  /** Why the last Publicar did not land, in the owner's words. */
  error?: string | null
  messages?: UiMessages
}

/** The API's `PAGE_VERSION_NOTE_MAX_LENGTH`: a longer note is refused there. */
const NOTE_MAX = 140

/**
 * Publicar, one press further: what the page would serve that the owner may not mean — a link to a
 * product gone, an empty showcase, a banner with no picture — and a line for the history. None of it
 * stops the publish; it is said so it is not found by a customer first.
 */
export function DesignPublishDialog({
  open,
  onOpenChange,
  pageName,
  problems,
  checkFailed = false,
  onRetryCheck,
  note,
  onNoteChange,
  onPublish,
  publishing,
  error = null,
  messages = defaultMessages,
}: DesignPublishDialogProps) {
  const text = messages.design.publishDialog
  const found = problems !== null && problems.length > 0
  const checking = problems === null && !checkFailed

  return (
    // Once Publicar is pressed the dialog stays until it lands: closing it would drop the screen's
    // refresh, and the bar would go on saying a page that just went up is not.
    <Dialog open={open} onOpenChange={(next: boolean) => (publishing && !next ? undefined : onOpenChange(next))}>
      <DialogContent closeLabel={text.cancel} showCloseButton={!publishing} className="sm:max-w-lg">
        <form
          className="flex flex-col gap-4"
          onSubmit={(event) => {
            event.preventDefault()
            if (!publishing && !checking) onPublish()
          }}
        >
          <DialogHeader>
            <DialogTitle>{format(text.title, { page: pageName })}</DialogTitle>
            <DialogDescription>{text.intro}</DialogDescription>
          </DialogHeader>

          {checkFailed ? (
            <div role="alert" className="flex flex-col items-start gap-2">
              <p className="text-destructive text-sm">{text.checkFailed}</p>
              {onRetryCheck ? (
                <Button type="button" size="sm" variant="outline" onClick={onRetryCheck}>
                  {text.checkRetry}
                </Button>
              ) : null}
            </div>
          ) : problems === null ? (
            <div role="status" aria-busy="true" className="flex flex-col gap-2">
              <span className="sr-only">{text.checking}</span>
              <Skeleton aria-hidden="true" className="h-5 w-full" />
              <Skeleton aria-hidden="true" className="h-5 w-2/3" />
            </div>
          ) : found ? (
            <ul className="flex list-disc flex-col gap-1.5 pl-5 text-sm">
              {problems.map((problem, index) => (
                <li key={`${problem.kind}-${index}`}>
                  {format(text.problems[problem.kind], { block: problem.blockName, band: problem.bandName })}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted-foreground text-sm">{text.none}</p>
          )}

          <Field>
            <FieldLabel htmlFor="publish-note">{text.note}</FieldLabel>
            <Textarea
              id="publish-note"
              value={note}
              maxLength={NOTE_MAX}
              rows={2}
              placeholder={text.notePlaceholder}
              onChange={(event) => onNoteChange(event.target.value)}
            />
          </Field>

          {error ? (
            <p role="alert" className="text-destructive text-sm">
              {error}
            </p>
          ) : null}

          <DialogFooter>
            <Button type="button" variant="ghost" disabled={publishing} onClick={() => onOpenChange(false)}>
              {text.cancel}
            </Button>
            <Button type="submit" disabled={publishing || checking}>
              {publishing ? text.publishing : found || checkFailed ? text.publishAnyway : text.publish}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
