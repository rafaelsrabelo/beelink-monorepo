"use client"

// Libs
import { EyeIcon, EyeOffIcon, GripVerticalIcon, Trash2Icon } from "lucide-react"

// UI
import { Button } from "@harness-monorepo/ui/components/button"
import { cn } from "@harness-monorepo/ui/lib/utils"

// Locales
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import { useArrangeItem } from "./design-arrange"
import { RowThumbnail } from "./row-thumbnail"
import type { StorefrontSpan } from "../storefront/storefront-band-cell"
import { BesideActions } from "./beside-actions"
import type { ComponentKind, DeviceVisibility } from "./design-types"
import { spanLabelOf } from "./span-field"

/** A block's slice of its band. The storefront's own type: the row offers what the band draws. */
export type ArrangementSpan = StorefrontSpan

export interface ArrangementItem {
  id: string
  kind: ComponentKind
  /** Null on a component the shopkeeper has not titled. The row falls back to the kind's name. */
  title: string | null
  /** A banner's first picture, where it has one. Every other kind draws its glyph instead. */
  imageUrl?: string | null
  span: ArrangementSpan
  isActive: boolean
  /** Where it shows. Absent is everywhere, which the row does not mention. */
  visibleOn?: DeviceVisibility
  /**
   * Whether the row draws a bin. Absent means yes.
   *
   * Decided by the screen and not by the kind, because the answer is a count the screen has and
   * this block does not: the shop's last product list cannot go, but a duplicate can. A rule keyed
   * on the kind alone was what left a shop with two shelves and no bin on either.
   */
  deletable?: boolean
  /**
   * The block has nothing to draw, so the shop window draws nothing at all for it.
   *
   * Said out loud because a silent one is what made a landing page and its editor disagree: the
   * panel listed a heading with no words and a hero with no pictures, the preview showed neither,
   * and nothing on the screen explained the difference. An empty block is not broken — it is one
   * the shopkeeper has not finished — and the row is where that gets said.
   */
  empty?: boolean
}

/**
 * Every block has a slice of its band, so every block is offered one — a heading beside a banner is
 * as reachable as two banners. The strip above the header is the exception: it is drawn above the
 * masthead, never in a band's grid, and a width there would change nothing.
 */
export function hasSpan(item: Pick<ArrangementItem, "kind">): boolean {
  return item.kind !== "ANNOUNCEMENT"
}

/**
 * What a row says under a block's name: its kind — or that it is empty — and its slice. The slice is
 * chosen in the Layout tab; said here, a band's arrangement still reads at a glance.
 */
export function rowLineOf(item: Pick<ArrangementItem, "kind" | "span" | "empty" | "visibleOn">, messages: UiMessages): string {
  const kind = item.empty ? messages.design.emptyBlock : messages.design.kinds[item.kind]
  const line = hasSpan(item) ? `${kind} · ${spanLabelOf(item.span, messages)}` : kind
  const only = item.visibleOn === "DESKTOP" ? messages.design.visibleOn.onlyDesktop : item.visibleOn === "PHONE" ? messages.design.visibleOn.onlyPhone : null
  return only ? `${line} · ${only}` : line
}

export function ArrangementRow({
  item,
  onToggle,
  onDelete,
  onEdit,
  selected = false,
  onAddBeside,
  inserting = false,
  messages,
}: {
  item: ArrangementItem
  /** Its fields are open: marked here as the preview marks it. */
  selected?: boolean
  onToggle: (id: string, isActive: boolean) => void
  /** Absent where a kind cannot be deleted; the row then draws no bin at all. */
  onDelete?: (id: string) => void
  /** Absent where a kind has nothing to write; the row is then not a button. */
  onEdit?: (id: string) => void
  /** A block beside this one, in its row. Absent when the row has no room. */
  onAddBeside?: () => void
  inserting?: boolean
  messages: UiMessages
}) {
  const text = messages.design
  const drag = useArrangeItem(item.id)

  // A block the shopkeeper titled is called by that title; one they have not is called by its
  // kind. "Sem título" on four rows tells them which blocks are unfinished and nothing about
  // which is which.
  const name = item.title?.trim() || text.kinds[item.kind]

  return (
    <li
      ref={drag.setNodeRef}
      style={drag.style}
      className={cn(
        "bg-shell-surface border-shell-border flex flex-col gap-2 rounded-xl border p-2",
        drag.isDragging && "z-10 opacity-80 shadow-md",
        !item.isActive && "opacity-60",
        selected && "ring-primary ring-2",
      )}
      {...(selected ? { "aria-current": "true" as const } : {})}
    >
      {/*
        One compact line: the handle, the picture, the name with its kind and slice, and the two
        actions. The slice's control lives in the Layout tab: measured at the panel's real width, a
        size control beside the name left the name eight pixels, and on a line of its own it made
        every row twice as tall.
      */}
      <div className="flex items-center gap-2">
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

      <RowThumbnail kind={item.kind} imageUrl={item.imageUrl ?? null} />

      {/*
        The name is the way in to editing, where there is anything to edit. A row that is a button
        and a row that is not look the same until the pointer is over them, which is what stops the
        list reading as five buttons and two labels.
      */}
      {onEdit ? (
        <button
          type="button"
          data-design-node={item.id}
          onClick={() => onEdit(item.id)}
          className="focus-visible:ring-ring flex min-w-0 flex-1 flex-col rounded-md px-1 text-left outline-none hover:underline focus-visible:ring-2"
        >
          <span className="truncate text-sm font-medium">{name}</span>
          {/* Two lines: "Banner · Um terço · Só no computador" does not fit the column's one. */}
          <span className="text-muted-foreground line-clamp-2 text-xs">{rowLineOf(item, messages)}</span>
        </button>
      ) : (
        <div className="flex min-w-0 flex-1 flex-col px-1">
          <p className="truncate text-sm font-medium">{name}</p>
          <p className="text-muted-foreground line-clamp-2 text-xs">{rowLineOf(item, messages)}</p>
        </div>
      )}


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

      {onDelete && item.deletable !== false ? (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={`${text.deleteBlock}: ${name}`}
          onClick={() => onDelete(item.id)}
        >
          <Trash2Icon aria-hidden="true" className="size-4" />
        </Button>
      ) : null}
      </div>

      <BesideActions name={name} {...(onAddBeside ? { onAddBeside } : {})} disabled={inserting} messages={messages} />
    </li>
  )
}
