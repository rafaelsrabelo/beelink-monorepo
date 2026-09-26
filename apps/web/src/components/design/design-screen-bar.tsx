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
import { usePageDraft, usePublishPage } from "@/services/page/page-draft-hooks"
import { usePages } from "@/services/page/store-pages-hooks"
import { useDesignPages } from "@/stores/design-pages"
import { pageRowsOf, shopHrefOf } from "./design-pages"
import { pageErrorCopy } from "./page-error-copy"
import type { useDesignDraft } from "./use-design-draft"

export interface DesignScreenBarProps {
  slug: string
  shopName: string
  /** The page being edited — the home or a landing — as the server read it. */
  page: StorePage
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
 * Publicar sends what was arranged in this browser, then freezes the draft as the page's next
 * version — which is what the shop serves, and what puts a landing up — and reloads the screen's
 * read so the bar says so. What was saved already (a block's words, a new band) is in the draft on
 * the server, and the API says whether it differs from what is served.
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
  const saved = usePageDraft(slug, page.id)
  const freeze = usePublishPage(slug, page.id)
  const homeTitle = messages.design.frame.homePage
  const pageName = page.kind === "HOME" ? homeTitle : page.title
  const published = page.status === "PUBLISHED"
  const links = pageRowsOf(slug, pages.data ?? [], homeTitle).filter((row) => row.status !== "ARCHIVED")

  const publish = () => {
    freeze.reset()
    draft.publish(() => freeze.mutate(undefined, { onSuccess: () => router.refresh() }))
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
          currentId={page.id}
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
      unpublished={saved.data?.hasUnpublishedChanges ?? false}
      pagePublished={published}
      publishError={freeze.error ? (pageErrorCopy(freeze.error, web) ?? messages.design.pages.publishFailed) : null}
      publishing={draft.publishing || freeze.isPending}
      onPublish={publish}
      onDiscard={draft.discard}
      shopHref={shopHrefOf(slug, page)}
      onOpenStructure={onOpenStructure}
      onOpenInspector={onOpenInspector}
      linkComponent={AppLink}
      messages={messages}
    />
  )
}
