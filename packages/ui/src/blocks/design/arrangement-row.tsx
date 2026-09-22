"use client"

// Libs
import {
  BadgeCheckIcon,
  EyeIcon,
  EyeOffIcon,
  GalleryHorizontalEndIcon,
  GripVerticalIcon,
  ImageIcon,
  LayoutGridIcon,
  TagsIcon,
  TypeIcon,
} from "lucide-react"

// UI
import { Button } from "@harness-monorepo/ui/components/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@harness-monorepo/ui/components/select"
import { cn } from "@harness-monorepo/ui/lib/utils"

// Locales
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import { useArrangeItem } from "./design-arrange"
import type { SectionKind } from "./design-types"

export type ArrangementLayout = "FULL" | "HALVES" | "THIRDS"

export interface ArrangementItem {
  id: string
  kind: SectionKind
  /** Null on a block the shopkeeper has not titled. The row falls back to the kind's name. */
  title: string | null
  imageUrl: string | null
  layout: ArrangementLayout
  isActive: boolean
}

/**
 * How wide is a question about a poster, and only about a poster.
 *
 * A cover is as wide as the shopkeeper's `width` says and a heading is as wide as the page; asking
 * "full, half or a third" of either would be offering a choice that changes nothing.
 */
function hasLayout(kind: SectionKind): boolean {
  return kind === "BANNER"
}

/**
 * The picture a row shows beside the title, or the glyph that stands in for one.
 *
 * Three of the five kinds have no picture, and a blank grey rectangle beside each of them makes a
 * list of blocks read as a list of broken images.
 */
const KIND_ICON: Record<SectionKind, typeof LayoutGridIcon> = {
  HERO: GalleryHorizontalEndIcon,
  BANNER: ImageIcon,
  TEXT: TypeIcon,
  BENEFITS: BadgeCheckIcon,
  CATEGORIES: TagsIcon,
  PRODUCTS: LayoutGridIcon,
}

export function ArrangementRow({
  item,
  onToggle,
  onLayoutChange,
  messages,
}: {
  item: ArrangementItem
  onToggle: (id: string, isActive: boolean) => void
  onLayoutChange: (id: string, layout: ArrangementLayout) => void
  messages: UiMessages
}) {
  const text = messages.design
  const drag = useArrangeItem(item.id)

  // A block the shopkeeper titled is called by that title; one they have not is called by its
  // kind. "Sem título" on four rows tells them which blocks are unfinished and nothing about
  // which is which.
  const name = item.title?.trim() || text.kinds[item.kind]
  const KindIcon = KIND_ICON[item.kind]

  const layoutLabel = (layout: string) =>
    layout === "HALVES" ? text.sizeHalves : layout === "THIRDS" ? text.sizeThirds : text.sizeFull

  return (
    <li
      ref={drag.setNodeRef}
      style={drag.style}
      className={cn(
        "bg-shell-surface border-shell-border flex items-center gap-2 rounded-xl border p-2",
        drag.isDragging && "z-10 opacity-80 shadow-md",
        !item.isActive && "opacity-60",
      )}
    >
      {/*
        The handle carries the drag, and it carries `attributes` with it: dnd-kit puts the role,
        the tab stop and the described-by on whatever it is spread onto, so splitting them from the
        listeners would leave a control that announces as draggable and cannot be driven.
      */}
      <button
        type="button"
        aria-label={`${text.dragHandle}: ${name}`}
        className="text-muted-foreground hover:text-foreground cursor-grab touch-none rounded-md p-1"
        {...drag.handleProps}
      >
        <GripVerticalIcon aria-hidden="true" className="size-4" />
      </button>

      <span className="bg-muted text-muted-foreground flex h-9 w-14 shrink-0 items-center justify-center overflow-hidden rounded-md">
        {item.imageUrl ? (
          <img src={item.imageUrl} alt="" aria-hidden="true" className="size-full object-cover" />
        ) : (
          <KindIcon aria-hidden="true" className="size-4" />
        )}
      </span>

      <div className="flex min-w-0 flex-1 flex-col">
        <p className="truncate text-sm font-medium">{name}</p>
        {/* The kind, said out loud, because a titled block otherwise gives no clue what it is. */}
        {item.title?.trim() ? (
          <p className="text-muted-foreground truncate text-xs">{text.kinds[item.kind]}</p>
        ) : null}
      </div>

      {hasLayout(item.kind) ? (
        <Select
          value={item.layout}
          onValueChange={(next: string | null) => onLayoutChange(item.id, (next ?? "FULL") as ArrangementLayout)}
        >
          <SelectTrigger aria-label={`${text.sizeLabel}: ${name}`} className="w-28 shrink-0">
            <SelectValue>{(selected: string) => layoutLabel(selected)}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="FULL">{text.sizeFull}</SelectItem>
            <SelectItem value="HALVES">{text.sizeHalves}</SelectItem>
            <SelectItem value="THIRDS">{text.sizeThirds}</SelectItem>
          </SelectContent>
        </Select>
      ) : null}

      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label={`${item.isActive ? text.hide : text.show}: ${name}`}
        aria-pressed={item.isActive}
        onClick={() => onToggle(item.id, !item.isActive)}
      >
        {item.isActive ? (
          <EyeIcon aria-hidden="true" className="size-4" />
        ) : (
          <EyeOffIcon aria-hidden="true" className="size-4" />
        )}
      </Button>
    </li>
  )
}
