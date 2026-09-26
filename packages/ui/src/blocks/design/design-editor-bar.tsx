"use client"

// React
import type { MouseEvent, ReactNode } from "react"

// Libs
import { ArrowLeftIcon, ExternalLinkIcon, ListTreeIcon, RotateCcwIcon, SlidersHorizontalIcon } from "lucide-react"

// UI
import { Button } from "@harness-monorepo/ui/components/button"
import { cn } from "@harness-monorepo/ui/lib/utils"

// Locales
import { defaultMessages, format } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import { AnchorLink, type LinkComponent } from "../auth/auth-link"
import { PreviewDeviceToggle, type PreviewDevice } from "./preview-device-toggle"

export interface DesignEditorBarProps {
  /** The shop's home in the panel, where "← Painel" goes. */
  backHref: string
  /** Called on "← Painel" before it navigates; the screen may stop it to ask first. */
  onBack?: (event: MouseEvent<HTMLAnchorElement>) => void
  shopName: string
  pageName: string
  /** Drawn in the page name's place: the way to another page. The name still titles the screen. */
  pageSwitcher?: ReactNode
  device: PreviewDevice
  onDeviceChange: (device: PreviewDevice) => void
  /** How many writes Publish would send. Zero reads as published, and leaves nothing to discard. */
  changes: number
  /**
   * False on a landing that is not up: the status says so, and Publicar puts the page up — with
   * nothing arranged to send, it is still the one thing left to do.
   */
  pagePublished?: boolean
  publishing: boolean
  onPublish: () => void
  onDiscard: () => void
  /** The page in the shop window, opened in a tab of its own. Null on a page nobody is served yet. */
  shopHref: string | null
  /** Open the side columns as drawers; the buttons only exist where the columns do not fit. */
  onOpenStructure: () => void
  onOpenInspector: () => void
  linkComponent?: LinkComponent
  messages?: UiMessages
}

/** The bar's controls, one height, on the header's own tokens. */
const ON_DARK =
  "h-9 text-header-foreground hover:bg-header-field-hover hover:text-header-foreground focus-visible:ring-header-foreground/70"

/**
 * The design editor's bar: where the page is, how it is being looked at, and what is waiting to go live.
 *
 * Dark like the panel's header, because it is the same kind of chrome. Three regions, as in the
 * reference: the way back and the page on the left, the device in the middle, the draft on the
 * right. A phone gets one row instead, words dropped to their icons and no device toggle — the
 * preview there is always the phone's (`usePreviewDevice`) — so Publicar is in reach and nothing overlaps.
 */
export function DesignEditorBar({
  backHref,
  onBack,
  shopName,
  pageName,
  pageSwitcher,
  device,
  onDeviceChange,
  changes,
  pagePublished = true,
  publishing,
  onPublish,
  onDiscard,
  shopHref,
  onOpenStructure,
  onOpenInspector,
  linkComponent: Link = AnchorLink,
  messages = defaultMessages,
}: DesignEditorBarProps) {
  const text = messages.design.frame
  const changed = changes > 0
  const counted = changes === 1 ? text.draftOne : format(text.draft, { count: String(changes) })
  const status = !pagePublished ? messages.design.pages.notPublished : changed ? counted : text.published

  return (
    <header
      aria-label={text.barLabel}
      className="bg-header h-header flex shrink-0 items-center gap-2 px-3 md:grid md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]"
    >
      <div className="flex min-w-0 items-center gap-2">
        <Link
          href={backHref}
          onClick={onBack}
          className={cn("flex shrink-0 items-center gap-1.5 rounded-lg px-2 text-sm font-medium outline-none focus-visible:ring-2", ON_DARK)}
        >
          <ArrowLeftIcon aria-hidden="true" className="size-4" />
          <span className="sr-only sm:not-sr-only">{text.back}</span>
        </Link>

        {/* The screen's heading: read in full by a screen reader, drawn as the breadcrumb where it fits. */}
        <h1 className="text-header-foreground/70 sr-only min-w-0 items-center gap-1.5 truncate text-sm font-normal md:not-sr-only md:flex">
          <span className="sr-only">{messages.design.title}: </span>
          <span className="truncate">{shopName}</span>
          <span aria-hidden="true">/</span>
          {pageSwitcher ? <span className="sr-only">{pageName}</span> : <span className="text-header-foreground truncate font-medium">{pageName}</span>}
        </h1>
        {pageSwitcher ? <div className="hidden min-w-0 md:block">{pageSwitcher}</div> : null}
      </div>

      <div className="hidden sm:block">
        <PreviewDeviceToggle value={device} onChange={onDeviceChange} tone="header" messages={messages} />
      </div>

      <div className="ml-auto flex min-w-0 items-center justify-end gap-1.5">
        <Button type="button" variant="ghost" className={cn("px-2 lg:hidden", ON_DARK)} onClick={onOpenStructure}>
          <ListTreeIcon aria-hidden="true" className="size-4" />
          <span className="sr-only xl:not-sr-only">{text.structure}</span>
        </Button>
        <Button type="button" variant="ghost" className={cn("px-2 lg:hidden", ON_DARK)} onClick={onOpenInspector}>
          <SlidersHorizontalIcon aria-hidden="true" className="size-4" />
          <span className="sr-only xl:not-sr-only">{text.inspector}</span>
        </Button>

        {/* Always there, so a draft is never unannounced: the dot on a phone, the words where they fit. */}
        <span role="status" className="text-header-foreground/80 flex shrink-0 items-center gap-1.5 px-1 text-sm">
          <span aria-hidden="true" className={cn("size-2 rounded-full", changed || !pagePublished ? "bg-header-pending" : "bg-header-foreground/40")} />
          <span className="sr-only lg:not-sr-only">{status}</span>
        </span>

        {shopHref ? (
          <Link
            href={shopHref}
            target="_blank"
            rel="noreferrer"
            className={cn(
              "border-header-border hidden shrink-0 items-center gap-1.5 rounded-lg border px-3 text-sm font-medium outline-none focus-visible:ring-2 md:flex",
              ON_DARK,
            )}
          >
            {text.viewInShop}
            <ExternalLinkIcon aria-hidden="true" className="size-3.5" />
          </Link>
        ) : null}

        {changed ? (
          <Button type="button" variant="ghost" className={cn("shrink-0 px-2 sm:px-2.5", ON_DARK)} disabled={publishing} onClick={onDiscard}>
            <RotateCcwIcon aria-hidden="true" className="size-4 sm:hidden" />
            <span className="sr-only sm:not-sr-only">{messages.design.discard}</span>
          </Button>
        ) : null}
        <Button
          type="button"
          className="bg-header-foreground text-header hover:bg-header-foreground/90 h-9 shrink-0 px-3 font-semibold sm:px-4"
          disabled={(pagePublished && !changed) || publishing}
          onClick={onPublish}
        >
          {publishing ? messages.design.publishing : pagePublished ? messages.design.publish : messages.design.pages.publishPage}
        </Button>
      </div>
    </header>
  )
}
