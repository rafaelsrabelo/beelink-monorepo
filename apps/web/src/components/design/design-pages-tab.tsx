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
import { pageRowsOf } from "./design-pages"
import { pageErrorCopy } from "./page-error-copy"

export interface DesignPagesTabProps {
  slug: string
  /** The page being edited: the home's id is the list's to know, so the home is "home" here. */
  currentId: string | null
  /** Asks before an unpublished arrangement is left behind, as "← Painel" does. */
  onNavigate: (event: MouseEvent<HTMLAnchorElement>) => void
  onCreate?: () => void
  onSettings?: (id: string) => void
  messages: UiMessages
  web: WebMessages
}

/**
 * The structure column's Páginas tab: every page of the shop, the way to edit each, and a landing's
 * status changed where it is listed. A change to the page being edited reloads the screen's own read,
 * so the bar says at once whether the page is up.
 */
export function DesignPagesTab({ slug, currentId, onNavigate, onCreate, onSettings, messages, web }: DesignPagesTabProps) {
  const router = useRouter()
  const pages = usePages(slug)
  const update = useUpdatePage(slug)
  const rows = pages.data ? pageRowsOf(slug, pages.data, messages.design.frame.homePage) : null
  const current = currentId ?? pages.data?.find((page) => page.kind === "HOME")?.id ?? ""

  const changeStatus = (pageId: string, status: PageStatus) =>
    update.mutate({ pageId, payload: { status } }, { onSuccess: () => (pageId === currentId ? router.refresh() : undefined) })

  return (
    <DesignPageList
      pages={rows}
      currentId={current}
      onNavigate={onNavigate}
      onStatus={changeStatus}
      {...(onCreate ? { onCreate } : {})}
      {...(onSettings ? { onSettings } : {})}
      busy={update.isPending}
      error={update.error ? (pageErrorCopy(update.error, web) ?? messages.design.pages.failed) : null}
      loadFailed={pages.isError}
      onRetry={() => void pages.refetch()}
      linkComponent={AppLink}
      messages={messages}
    />
  )
}
