"use client"

// Next
import { useRouter } from "next/navigation"

// React
import type { MouseEvent } from "react"

// Types
import type { PageStatus } from "@harness-monorepo/contracts"

// UI
import { DesignPageList } from "@harness-monorepo/ui/blocks/design/design-page-list"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// App
import { AppLink } from "@/components/app-link"
import type { WebMessages } from "@/locales"
import { usePages, useUpdatePage } from "@/services/page/store-pages-hooks"
import { useDesignPages } from "@/stores/design-pages"
import { pageRowsOf } from "./design-pages"
import { PageHistory } from "./page-history"
import { pageErrorCopy } from "./page-error-copy"
import { withChoice } from "./template-choice-address"

export interface DesignPagesTabProps {
  slug: string
  /** The landing being edited. Null on the home, whose id only the list knows. */
  currentId: string | null
  /** Asks before an unpublished arrangement is left behind, as "← Painel" does. */
  onNavigate: (event: MouseEvent<HTMLAnchorElement>) => void
  /** To another page's editor, through the same question. */
  go: (href: string) => void
  /** The gallery opened from here: on a narrow screen this tab is in a drawer, which would stay over what the gallery leaves. */
  onTemplatesOpen?: () => void
  messages: UiMessages
  web: WebMessages
}

/**
 * The structure column's Páginas tab: every page of the shop, the way to edit each, and a landing's
 * status changed where it is listed, and each page's way to the models. A change to the page being edited reloads the screen's own read,
 * so the bar says at once whether the page is up.
 */
export function DesignPagesTab({ slug, currentId, onNavigate, go, onTemplatesOpen, messages, web }: DesignPagesTabProps) {
  const router = useRouter()
  const openNew = useDesignPages((state) => state.openNew)
  const openSettings = useDesignPages((state) => state.openSettings)
  const openTemplates = useDesignPages((state) => state.openTemplates)
  const pages = usePages(slug)
  const update = useUpdatePage(slug)
  const rows = pages.data ? pageRowsOf(slug, pages.data, messages.design.frame.homePage) : null
  const current = currentId ?? pages.data?.find((page) => page.kind === "HOME")?.id ?? ""

  // The gallery is the open page's: a model is written naming the revision of the page the editor
  // has open. Another page's models are that page's editor, asked to open them on arrival.
  const showTemplates = (pageId: string) => {
    const row = rows?.find((candidate) => candidate.id === pageId)
    if (pageId === current) {
      onTemplatesOpen?.()
      openTemplates()
    } else if (row) go(withChoice(row.href))
  }

  const changeStatus = (pageId: string, status: PageStatus) =>
    update.mutate({ pageId, payload: { status } }, { onSuccess: () => (pageId === currentId ? router.refresh() : undefined) })

  return (
    <div className="flex flex-col gap-6">
      <DesignPageList
        pages={rows}
        currentId={current}
        onNavigate={onNavigate}
        onStatus={changeStatus}
        onCreate={openNew}
        onSettings={openSettings}
        onTemplates={showTemplates}
        busy={update.isPending}
        error={update.error ? (pageErrorCopy(update.error, web) ?? messages.design.pages.failed) : null}
        loadFailed={pages.isError}
        onRetry={() => void pages.refetch()}
        linkComponent={AppLink}
        messages={messages}
      />
      <PageHistory slug={slug} pageId={current} messages={messages} web={web} />
    </div>
  )
}
