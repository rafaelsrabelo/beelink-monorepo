"use client"

// Next
import { useRouter } from "next/navigation"

// React
import { useState } from "react"

// Types
import type { PageProblem, Section, StorePage } from "@harness-monorepo/contracts"

// UI
import { bandLabelOf } from "@harness-monorepo/ui/blocks/design/band-label"
import { DesignPublishDialog, type DesignPublishProblem } from "@harness-monorepo/ui/blocks/design/design-publish-dialog"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// App
import type { WebMessages } from "@/locales"
import { usePageProblems, usePublishPage } from "@/services/page/page-draft-hooks"
import { useDesignPages } from "@/stores/design-pages"
import { labelOf } from "./design-draft"
import { pageErrorCopy } from "./page-error-copy"
import type { useDesignDraft } from "./use-design-draft"

export interface PublishPageProps {
  slug: string
  page: StorePage
  draft: Pick<ReturnType<typeof useDesignDraft>, "publish" | "saving" | "saved">
  messages: UiMessages
  web: WebMessages
}

/** Each problem named as the structure column names things: the block's label, and its band's. */
function namedProblems(problems: readonly PageProblem[], saved: readonly Section[], messages: UiMessages): DesignPublishProblem[] {
  return problems.map((problem) => {
    const index = saved.findIndex((section) => section.id === problem.sectionId)
    const component = saved[index]?.components.find((row) => row.id === problem.componentId)

    return {
      kind: problem.kind,
      blockName: component ? labelOf(component.kind, component.title, messages) : "—",
      bandName: bandLabelOf(saved[index]?.name, index + 1, messages),
    }
  })
}

/**
 * Publicar, wired: the draft checked the way the shop would resolve it, once nothing is still on its
 * way there; then whatever is still being saved goes first, and the draft is frozen as the page's
 * next version with the note left for the history. The screen's read is taken again after, so the
 * bar and the preview say what is now served.
 */
export function PublishPage({ slug, page, draft, messages, web }: PublishPageProps) {
  const router = useRouter()
  const open = useDesignPages((state) => state.dialog?.kind === "publish")
  const close = useDesignPages((state) => state.close)
  const [note, setNote] = useState("")
  const freeze = usePublishPage(slug, page.id)
  const problems = usePageProblems(slug, page.id, open && !draft.saving)

  const dismiss = () => {
    close()
    freeze.reset()
    setNote("")
  }

  const publish = () =>
    draft.publish(() =>
      freeze.mutate(
        { note: note.trim() || null },
        {
          onSuccess: () => {
            dismiss()
            router.refresh()
          },
        },
      ),
    )

  return (
    <DesignPublishDialog
      open={open}
      onOpenChange={(next) => (next ? undefined : dismiss())}
      pageName={page.kind === "HOME" ? messages.design.frame.homePage : page.title}
      problems={problems.data ? namedProblems(problems.data, draft.saved, messages) : problems.isError ? [] : null}
      note={note}
      onNoteChange={setNote}
      onPublish={publish}
      publishing={freeze.isPending || draft.saving}
      error={freeze.error ? (pageErrorCopy(freeze.error, web) ?? messages.design.pages.publishFailed) : null}
      messages={messages}
    />
  )
}
