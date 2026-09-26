"use client"

// Next
import { useRouter } from "next/navigation"

// React
import type { MouseEvent } from "react"

// Types
import type { StorePage } from "@harness-monorepo/contracts"

// UI
import { DesignEditorBar } from "@harness-monorepo/ui/blocks/design/design-editor-bar"
import { DesignPageSwitcher } from "@harness-monorepo/ui/blocks/design/design-page-switcher"
import type { PreviewDevice } from "@harness-monorepo/ui/blocks/design/preview-device-toggle"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// App
import { AppLink } from "@/components/app-link"
import type { WebMessages } from "@/locales"
import { usePages, useUpdatePage } from "@/services/page/store-pages-hooks"
import { useDesignPages } from "@/stores/design-pages"
import { pageRowsOf, shopHrefOf } from "./design-pages"
import { pageErrorCopy } from "./page-error-copy"
import type { useDesignDraft } from "./use-design-draft"

export interface DesignScreenBarProps {
  slug: string
  shopName: string
  /** The landing being edited, as the server read it. Null on the home. */
  page: StorePage | null
  draft: Pick<ReturnType<typeof useDesignDraft>, "changeCount" | "publishing" | "publish" | "discard">
  /** Asks before an unpublished arrangement is left behind, on every way out of this page. */
  onLeave: (event: MouseEvent<HTMLAnchorElement>) => void
  device: PreviewDevice
  onDeviceChange: (device: PreviewDevice) => void
  onOpenStructure: () => void
  onOpenInspector: () => void
  messages: UiMessages
  web: WebMessages
}

/**
 * The editor's bar, for whichever page is open: its name as the way to another page, and Publicar.
 *
 * On a landing that is not up, Publicar sends what was arranged and then puts the page up — the one
 * press the shopkeeper expects of the word — and reloads the screen's read so the bar says so.
 */
export function DesignScreenBar({
  slug,
  shopName,
  page,
  draft,
  onLeave,
  device,
  onDeviceChange,
  onOpenStructure,
  onOpenInspector,
  messages,
  web,
}: DesignScreenBarProps) {
  const router = useRouter()
  const openNew = useDesignPages((state) => state.openNew)
  const pages = usePages(slug)
  const update = useUpdatePage(slug)
  const homeTitle = messages.design.frame.homePage
  const pageName = page?.title ?? homeTitle
  const published = !page || page.status === "PUBLISHED"
  const links = pageRowsOf(slug, pages.data ?? [], homeTitle).filter((row) => row.status !== "ARCHIVED")
  const currentId = page?.id ?? pages.data?.find((row) => row.kind === "HOME")?.id ?? ""

  const publish = () => {
    update.reset()
    draft.publish(
      page && !published
        ? () => update.mutate({ pageId: page.id, payload: { status: "PUBLISHED" } }, { onSuccess: () => router.refresh() })
        : undefined,
    )
  }

  return (
    <DesignEditorBar
      backHref={`/admin/${slug}`}
      onBack={onLeave}
      shopName={shopName}
      pageName={pageName}
      pageSwitcher={
        <DesignPageSwitcher
          pages={links}
          currentId={currentId}
          currentTitle={pageName}
          onNavigate={onLeave}
          onCreate={openNew}
          linkComponent={AppLink}
          messages={messages}
        />
      }
      device={device}
      onDeviceChange={onDeviceChange}
      changes={draft.changeCount}
      pagePublished={published}
      publishError={update.error ? (pageErrorCopy(update.error, web) ?? messages.design.pages.publishFailed) : null}
      publishing={draft.publishing || update.isPending}
      onPublish={publish}
      onDiscard={draft.discard}
      shopHref={page ? shopHrefOf(slug, page) : `/${slug}`}
      onOpenStructure={onOpenStructure}
      onOpenInspector={onOpenInspector}
      linkComponent={AppLink}
      messages={messages}
    />
  )
}
