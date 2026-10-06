"use client"

// Libs
import { XIcon } from "lucide-react"

// UI
import { Button } from "@harness-monorepo/ui/components/button"
import { Skeleton } from "@harness-monorepo/ui/components/skeleton"

// Locales
import { defaultMessages, format } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import type { DesignPublishProblem } from "./design-publish-dialog"

export interface TemplateAppliedNoticeProps {
  /** The model now in the draft, by the name its card carried. */
  templateName: string
  /** What the page would serve that the owner may not mean, as Publicar lists it. Null while it is being checked. */
  problems: readonly DesignPublishProblem[] | null
  /** The check did not answer: the notice says what was done and lists nothing. */
  checkFailed?: boolean
  onPublish: () => void
  onDismiss: () => void
  messages?: UiMessages
}

/**
 * What the editor says once a model is in the draft: that it is there, that the shop has not
 * changed, and what the model left that the owner should look at before Publicar — in the same
 * sentences Publicar's own dialog uses, so a problem reads the same in both places.
 *
 * A line in the editor and not a toast: a list has to stay until it is read.
 */
export function TemplateAppliedNotice({
  templateName,
  problems,
  checkFailed = false,
  onPublish,
  onDismiss,
  messages = defaultMessages,
}: TemplateAppliedNoticeProps) {
  const text = messages.design.templateApplied
  const sentences = messages.design.publishDialog.problems

  return (
    <div role="status" className="bg-shell-surface border-shell-border flex items-start gap-3 border-b px-4 py-2.5 text-sm">
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <p className="font-medium">{format(text.applied, { name: templateName })}</p>
        {checkFailed ? null : problems === null ? (
          <div aria-busy="true" className="flex flex-col gap-1.5">
            <span className="sr-only">{text.checking}</span>
            <Skeleton aria-hidden="true" className="h-4 w-2/3" />
          </div>
        ) : problems.length > 0 ? (
          <>
            <p className="text-muted-foreground">{text.problemsTitle}</p>
            <ul className="flex list-disc flex-col gap-1 pl-5">
              {problems.map((problem, index) => (
                <li key={`${problem.kind}-${index}`}>{format(sentences[problem.kind], { block: problem.blockName, band: problem.bandName })}</li>
              ))}
            </ul>
          </>
        ) : null}
      </div>
      <Button type="button" size="sm" onClick={onPublish}>
        {text.publish}
      </Button>
      <Button type="button" size="icon-sm" variant="ghost" aria-label={text.dismiss} onClick={onDismiss}>
        <XIcon aria-hidden="true" className="size-4" />
      </Button>
    </div>
  )
}
