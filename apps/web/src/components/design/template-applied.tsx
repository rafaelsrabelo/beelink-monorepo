"use client"

// Types
import type { StorePage } from "@harness-monorepo/contracts"

// UI
import { TemplateAppliedNotice } from "@harness-monorepo/ui/blocks/design/template-applied-notice"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// App
import { usePageProblems } from "@/services/page/page-draft-hooks"
import { useDesignPages } from "@/stores/design-pages"
import { namedProblems } from "./page-problems"
import type { useDesignDraft } from "./use-design-draft"

export interface TemplateAppliedProps {
  slug: string
  /** The page being edited: a model applied to another page is not this one's news. */
  page: StorePage
  draft: Pick<ReturnType<typeof useDesignDraft>, "saving" | "saved">
  messages: UiMessages
}

/**
 * The line under the editor's bar once a model is in this page's draft: it is there, the shop has
 * not changed, and what the page would now serve that the owner may not mean — the same check
 * Publicar makes, asked again whenever the draft is written, and only once nothing is still on its
 * way there.
 */
export function TemplateApplied({ slug, page, draft, messages }: TemplateAppliedProps) {
  const applied = useDesignPages((state) => state.applied)
  const dismiss = useDesignPages((state) => state.dismissApplied)
  const openPublish = useDesignPages((state) => state.openPublish)
  const shown = applied?.pageId === page.id
  const problems = usePageProblems(slug, page.id, shown && !draft.saving)

  if (!applied || !shown) return null

  return (
    <TemplateAppliedNotice
      templateName={messages.design.pages.form.templates[applied.templateId].title}
      problems={problems.data ? namedProblems(problems.data, draft.saved, messages) : null}
      checkFailed={problems.isError && !problems.isFetching}
      onPublish={openPublish}
      onDismiss={dismiss}
      messages={messages}
    />
  )
}
