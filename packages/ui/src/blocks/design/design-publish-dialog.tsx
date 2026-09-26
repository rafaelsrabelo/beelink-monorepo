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

/** One problem, already named by the screen: which block, in which band. */
export interface DesignPublishProblem {
  kind: "LINK_TO_MISSING_PRODUCT" | "LINK_TO_MISSING_CATEGORY" | "SHOWCASE_EMPTY" | "BANNER_WITHOUT_IMAGE"
  blockName: string
  bandName: string
}

export interface DesignPublishDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  pageName: string
  /** What the draft would serve that the owner may not mean. Null while it is being checked. */
  problems: readonly DesignPublishProblem[] | null
  note: string
  onNoteChange: (note: string) => void
  onPublish: () => void
  publishing: boolean
  /** Why the last Publicar did not land, in the owner's words. */
  error?: string | null
  messages?: UiMessages
}

/** What a search result shows of a note in the history: a line, not a changelog. */
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
  note,
  onNoteChange,
  onPublish,
  publishing,
  error = null,
  messages = defaultMessages,
}: DesignPublishDialogProps) {
  const text = messages.design.publishDialog
  const found = problems !== null && problems.length > 0

  return (
    <Dialog open={open} onOpenChange={(next: boolean) => onOpenChange(next)}>
      <DialogContent closeLabel={text.cancel} className="sm:max-w-lg">
        <form
          className="flex flex-col gap-4"
          onSubmit={(event) => {
            event.preventDefault()
            if (!publishing) onPublish()
          }}
        >
          <DialogHeader>
            <DialogTitle>{format(text.title, { page: pageName })}</DialogTitle>
            <DialogDescription>{text.intro}</DialogDescription>
          </DialogHeader>

          {problems === null ? (
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
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              {text.cancel}
            </Button>
            <Button type="submit" disabled={publishing || problems === null}>
              {publishing ? text.publishing : found ? text.publishAnyway : text.publish}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
