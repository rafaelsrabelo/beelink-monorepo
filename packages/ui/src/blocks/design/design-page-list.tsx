"use client"

// React
import type { MouseEvent } from "react"

// Libs
import { PlusIcon } from "lucide-react"

// UI
import { Button } from "@harness-monorepo/ui/components/button"
import { Skeleton } from "@harness-monorepo/ui/components/skeleton"

// Locales
import { defaultMessages, format } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import type { LinkComponent } from "../auth/auth-link"
import { DesignPageRow, type DesignPageRowData } from "./design-page-row"
import type { DesignPageLink } from "./design-page-switcher"

export interface DesignPageListProps {
  /** The home first, then the landings, as the screen ordered them. Null while they load. */
  pages: readonly DesignPageRowData[] | null
  currentId: string
  /** Every link's click, so the screen can ask before an unpublished arrangement is left behind. */
  onNavigate?: (event: MouseEvent<HTMLAnchorElement>) => void
  /** Put a landing up, take it down, archive it or bring it back. */
  onStatus?: (id: string, status: DesignPageLink["status"]) => void
  onSettings?: (id: string) => void
  onCreate?: () => void
  /** A change being written: the menus wait for it. */
  busy?: boolean
  /** What the last change answered when it failed, in the owner's words. */
  error?: string | null
  linkComponent?: LinkComponent
  messages?: UiMessages
}

/**
 * The Páginas tab: every page of the shop, each a link to edit it, and the way to a new landing.
 *
 * The archived ones are folded away under their count: they are served to nobody and are here to be
 * brought back, not to be scrolled past on the way to the pages that are up.
 */
export function DesignPageList({
  pages,
  currentId,
  onNavigate,
  onStatus,
  onSettings,
  onCreate,
  busy = false,
  error = null,
  linkComponent,
  messages = defaultMessages,
}: DesignPageListProps) {
  const text = messages.design.pages
  const live = pages?.filter((page) => page.status !== "ARCHIVED") ?? []
  const archived = pages?.filter((page) => page.status === "ARCHIVED") ?? []
  const row = (page: DesignPageRowData) => (
    <DesignPageRow
      key={page.id}
      page={page}
      current={page.id === currentId}
      busy={busy}
      {...(onNavigate ? { onNavigate } : {})}
      {...(onStatus ? { onStatus } : {})}
      {...(onSettings ? { onSettings } : {})}
      {...(linkComponent ? { linkComponent } : {})}
      messages={messages}
    />
  )

  return (
    <section aria-labelledby="design-pages-heading" className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <h2 id="design-pages-heading" className="text-sm font-semibold">
          {text.heading}
        </h2>
        {onCreate ? (
          <Button type="button" size="sm" variant="outline" onClick={onCreate} className="gap-1.5">
            <PlusIcon aria-hidden="true" className="size-4" />
            {text.newLanding}
          </Button>
        ) : null}
      </div>

      {error ? (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      ) : null}

      {pages === null ? (
        <>
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
        </>
      ) : (
        <>
          <ul className="flex flex-col gap-2">{live.map(row)}</ul>
          {live.every((page) => page.kind === "HOME") ? <p className="text-muted-foreground text-sm">{text.empty}</p> : null}
          {archived.length ? (
            <details className="group">
              <summary className="text-muted-foreground hover:text-foreground cursor-pointer text-sm">
                {format(text.archived, { count: String(archived.length) })}
              </summary>
              <ul className="mt-2 flex flex-col gap-2">{archived.map(row)}</ul>
            </details>
          ) : null}
        </>
      )}
    </section>
  )
}
