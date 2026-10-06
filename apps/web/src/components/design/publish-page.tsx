"use client"

// Next
import { useRouter } from "next/navigation"

// React
import { useState } from "react"

// Types
import type { StorePage } from "@harness-monorepo/contracts"

// UI
import { DesignPublishDialog } from "@harness-monorepo/ui/blocks/design/design-publish-dialog"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// App
import type { WebMessages } from "@/locales"
import { usePageProblems, usePublishPage } from "@/services/page/page-draft-hooks"
import { useDesignPages } from "@/stores/design-pages"
import { pageErrorCopy } from "./page-error-copy"
import { namedProblems } from "./page-problems"
import type { useDesignDraft } from "./use-design-draft"

export interface PublishPageProps {
  slug: string
  page: StorePage
  draft: Pick<ReturnType<typeof useDesignDraft>, "publish" | "saving" | "saved">
  messages: UiMessages
  web: WebMessages
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
            // "Falta publicar", said after a model was applied, is no longer true.
            useDesignPages.getState().dismissApplied()
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
      problems={problems.data ? namedProblems(problems.data, draft.saved, messages) : null}
      checkFailed={problems.isError && !problems.isFetching}
      onRetryCheck={() => void problems.refetch()}
      note={note}
      onNoteChange={setNote}
      onPublish={publish}
      publishing={freeze.isPending || draft.saving}
      error={freeze.error ? (pageErrorCopy(freeze.error, web) ?? messages.design.pages.publishFailed) : null}
      messages={messages}
    />
  )
}
