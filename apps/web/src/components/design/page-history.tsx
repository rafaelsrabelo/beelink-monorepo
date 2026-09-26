"use client"

// Next
import { useRouter } from "next/navigation"

// Types
import type { PageVersionSummary } from "@harness-monorepo/contracts"

// UI
import { DesignVersionList } from "@harness-monorepo/ui/blocks/design/design-version-list"
import type { DesignVersion } from "@harness-monorepo/ui/blocks/design/design-version-row"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// App
import type { WebMessages } from "@/locales"
import { usePageVersions, useRestoreVersion } from "@/services/page/page-draft-hooks"
import { pageErrorCopy } from "./page-error-copy"

/** The product's locale, as the rest of the panel writes dates in it. */
const WHEN = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" })

function versionOf(summary: PageVersionSummary): DesignVersion {
  return {
    id: summary.id,
    number: summary.number,
    when: WHEN.format(new Date(summary.createdAt)),
    author: summary.author?.name ?? null,
    note: summary.note,
    live: summary.live,
  }
}

export interface PageHistoryProps {
  slug: string
  /** The page being edited: its history is the one listed. */
  pageId: string
  messages: UiMessages
  web: WebMessages
}

/**
 * The page's versions, and the way back to one. A restore writes the version into the draft — queued
 * behind any save still out, like every other draft write — and the screen's read is taken again, so
 * the preview draws what the draft now holds. The shop changes only at the next Publicar.
 */
export function PageHistory({ slug, pageId, messages, web }: PageHistoryProps) {
  const router = useRouter()
  const versions = usePageVersions(slug, pageId)
  const restore = useRestoreVersion(slug, pageId)

  return (
    <DesignVersionList
      versions={versions.data ? versions.data.map(versionOf) : versions.isError ? [] : null}
      onRestore={(versionId) => restore.mutate(versionId, { onSuccess: () => router.refresh() })}
      restoring={restore.isPending}
      error={restore.error ? (pageErrorCopy(restore.error, web) ?? messages.design.history.failed) : null}
      messages={messages}
    />
  )
}
