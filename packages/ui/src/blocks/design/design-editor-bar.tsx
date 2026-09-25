"use client"

// React
import type { MouseEvent } from "react"

// Libs
import { ArrowLeftIcon, ExternalLinkIcon, ListTreeIcon, SlidersHorizontalIcon } from "lucide-react"

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
  device: PreviewDevice
  onDeviceChange: (device: PreviewDevice) => void
  /** How many writes Publish would send. Zero reads as published, and leaves nothing to discard. */
  changes: number
  publishing: boolean
  onPublish: () => void
  onDiscard: () => void
  /** The shop window, opened in a tab of its own so the editor stays where it is. */
  shopHref: string
  /** Open the side columns as drawers; the buttons only exist where the columns do not fit. */
  onOpenStructure: () => void
  onOpenInspector: () => void
  linkComponent?: LinkComponent
  messages?: UiMessages
}

const ON_DARK =
  "text-header-foreground hover:bg-header-field-hover hover:text-header-foreground focus-visible:ring-header-foreground/70"

/**
 * The design editor's bar: where the page is, how it is being looked at, and what is waiting to go live.
 *
 * Dark like the panel's header, because it is the same kind of chrome — the one surface that stays
 * dark in either theme. The status counts what Publish would write, so the number and the enabled
 * button never disagree.
 */
export function DesignEditorBar({
  backHref,
  onBack,
  shopName,
  pageName,
  device,
  onDeviceChange,
  changes,
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
  const status = !changed ? text.published : changes === 1 ? text.draftOne : format(text.draft, { count: String(changes) })

  return (
    <header aria-label={text.barLabel} className="bg-header h-header flex shrink-0 items-center gap-2 px-3">
      <Link
        href={backHref}
        onClick={onBack}
        className={cn("flex h-8 items-center gap-1.5 rounded-lg px-2 text-sm font-medium outline-none focus-visible:ring-2", ON_DARK)}
      >
        <ArrowLeftIcon aria-hidden="true" className="size-4" />
        {text.back}
      </Link>

      <p className="text-header-foreground/70 hidden min-w-0 items-center gap-1.5 truncate text-sm md:flex">
        <span className="truncate">{shopName}</span>
        <span aria-hidden="true">/</span>
        <span className="text-header-foreground truncate font-medium">{pageName}</span>
      </p>

      <div className="ml-auto flex items-center gap-2">
        <Button type="button" variant="ghost" size="sm" className={cn("lg:hidden", ON_DARK)} onClick={onOpenStructure}>
          <ListTreeIcon aria-hidden="true" className="size-4" />
          <span className="sr-only sm:not-sr-only">{text.structure}</span>
        </Button>
        <Button type="button" variant="ghost" size="sm" className={cn("lg:hidden", ON_DARK)} onClick={onOpenInspector}>
          <SlidersHorizontalIcon aria-hidden="true" className="size-4" />
          <span className="sr-only sm:not-sr-only">{text.inspector}</span>
        </Button>

        <PreviewDeviceToggle value={device} onChange={onDeviceChange} tone="header" messages={messages} />

        <span role="status" className="text-header-foreground/80 hidden items-center gap-1.5 text-sm xl:flex">
          <span aria-hidden="true" className={cn("size-2 rounded-full", changed ? "bg-header-accent" : "bg-header-foreground/40")} />
          {status}
        </span>

        <Link
          href={shopHref}
          target="_blank"
          rel="noreferrer"
          className={cn(
            "border-header-border hidden h-8 items-center gap-1.5 rounded-lg border px-3 text-sm font-medium outline-none focus-visible:ring-2 md:flex",
            ON_DARK,
          )}
        >
          {text.viewInShop}
          <ExternalLinkIcon aria-hidden="true" className="size-3.5" />
        </Link>

        {changed ? (
          <Button type="button" variant="ghost" size="sm" className={ON_DARK} disabled={publishing} onClick={onDiscard}>
            {messages.design.discard}
          </Button>
        ) : null}
        <Button
          type="button"
          size="sm"
          className="bg-header-foreground text-header hover:bg-header-foreground/90"
          disabled={!changed || publishing}
          onClick={onPublish}
        >
          {publishing ? messages.design.publishing : messages.design.publish}
        </Button>
      </div>
    </header>
  )
}
