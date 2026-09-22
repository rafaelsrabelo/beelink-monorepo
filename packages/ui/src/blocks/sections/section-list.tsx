"use client"

// Libs
import { ArrowDownIcon, ArrowUpIcon, ExternalLinkIcon, PencilIcon, Trash2Icon } from "lucide-react"

// UI
import { Badge } from "@harness-monorepo/ui/components/badge"
import { Button } from "@harness-monorepo/ui/components/button"

// Locales
import { defaultMessages } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

export interface SectionListItem {
  id: string
  title: string
  subtitle: string | null
  imageUrl: string
  /** Already a sentence: "Categoria · Blusas", or the address itself. The screen builds it. */
  destination: string
  external: boolean
  layoutLabel: string
  isActive: boolean
}

export interface SectionListProps {
  banners: readonly SectionListItem[]
  onEdit: (sectionId: string) => void
  onDelete: (sectionId: string) => void
  /** Swaps a banner with its neighbour. Absent hides the controls — a list of one cannot reorder. */
  onMove?: (sectionId: string, direction: -1 | 1) => void
  busyId?: string | null
  messages?: UiMessages
}

/**
 * The shop's posters, in the order they are drawn.
 *
 * A list and not a table: what a shopkeeper checks here is the picture, and a row of thumbnails is
 * the only view that answers "which one is that". The order is the point of the screen, so it is
 * the reading order too — the first row is the first poster.
 *
 * Moving is two buttons rather than a drag. They work with a keyboard, on a touch screen and with
 * no pointer at all, and the ticket that adds dragging writes to the same endpoint these do.
 */
export function SectionList({
  banners,
  onEdit,
  onDelete,
  onMove,
  busyId = null,
  messages = defaultMessages,
}: SectionListProps) {
  const text = messages.banners

  if (!banners.length) {
    return (
      <div className="flex flex-col items-center gap-1 rounded-xl border border-dashed py-12 text-center">
        <p className="font-medium">{text.empty}</p>
        <p className="text-muted-foreground text-sm">{text.emptyHint}</p>
      </div>
    )
  }

  return (
    <ul className="bg-shell-surface border-shell-border divide-y rounded-xl border shadow-xs">
      {banners.map((banner, at) => (
        <li key={banner.id} className="flex items-center gap-3 p-3">
          {/* Landscape, because that is the shape a poster is stored in and a square crop here
              would show the shopkeeper something their shop never draws. */}
          <span className="bg-muted h-12 w-20 shrink-0 overflow-hidden rounded-md">
            <img src={banner.imageUrl} alt="" aria-hidden="true" className="size-full object-cover" />
          </span>

          <div className="flex min-w-0 flex-1 flex-col">
            <div className="flex flex-wrap items-center gap-2">
              <p className="truncate font-medium">{banner.title}</p>
              {banner.isActive ? null : <Badge variant="outline">{text.hidden}</Badge>}
              {banner.external ? (
                <Badge variant="outline" className="gap-1">
                  <ExternalLinkIcon aria-hidden="true" className="size-3" />
                  {text.opensOutside}
                </Badge>
              ) : null}
            </div>
            <p className="text-muted-foreground truncate text-xs">
              {banner.layoutLabel} · {banner.destination}
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-1">
            {onMove ? (
              <>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={`${text.moveUp}: ${banner.title}`}
                  disabled={at === 0 || busyId !== null}
                  onClick={() => onMove(banner.id, -1)}
                >
                  <ArrowUpIcon aria-hidden="true" className="size-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={`${text.moveDown}: ${banner.title}`}
                  disabled={at === banners.length - 1 || busyId !== null}
                  onClick={() => onMove(banner.id, 1)}
                >
                  <ArrowDownIcon aria-hidden="true" className="size-4" />
                </Button>
              </>
            ) : null}
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={`${text.edit}: ${banner.title}`}
              disabled={busyId === banner.id}
              onClick={() => onEdit(banner.id)}
            >
              <PencilIcon aria-hidden="true" className="size-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={`${text.delete}: ${banner.title}`}
              disabled={busyId === banner.id}
              onClick={() => onDelete(banner.id)}
            >
              <Trash2Icon aria-hidden="true" className="size-4" />
            </Button>
          </div>
        </li>
      ))}
    </ul>
  )
}
