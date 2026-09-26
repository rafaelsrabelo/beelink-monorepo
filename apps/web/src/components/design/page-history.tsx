"use client"

// Next
import { useRouter } from "next/navigation"

// React
import { useState } from "react"

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

function versionOf(summary: PageVersionSummary, when: Intl.DateTimeFormat): DesignVersion {
  return {
    id: summary.id,
    number: summary.number,
    when: when.format(new Date(summary.createdAt)),
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
  const [asking, setAsking] = useState<string | null>(null)
  // Said until the history moves on: a publish adds a version, and the line would describe the past.
  const [restored, setRestored] = useState<{ number: number; newest: number | undefined } | null>(null)
  const when = new Intl.DateTimeFormat(messages.locale, { dateStyle: "short", timeStyle: "short" })
  const newest = versions.data?.[0]?.number

  const confirm = () => {
    const version = versions.data?.find((row) => row.id === asking)
    if (!version) return
    restore.mutate(version.id, {
      onSuccess: () => {
        setAsking(null)
        setRestored({ number: version.number, newest })
        router.refresh()
      },
    })
  }

  return (
    <DesignVersionList
      versions={versions.data ? versions.data.map((row) => versionOf(row, when)) : null}
      loadFailed={versions.isError}
      onRetry={() => void versions.refetch()}
      asking={asking}
      onAsk={(id) => {
        restore.reset()
        setAsking(id)
      }}
      onConfirm={confirm}
      restoring={restore.isPending}
      restored={restored && restored.newest === newest ? restored.number : null}
      error={restore.error ? (pageErrorCopy(restore.error, web) ?? messages.design.history.failed) : null}
      messages={messages}
    />
  )
}
