"use client"

// Libs
import type { Announcements } from "@dnd-kit/core"
import { EyeIcon, EyeOffIcon, GripVerticalIcon, LayoutGridIcon } from "lucide-react"

// UI
import { Button } from "@harness-monorepo/ui/components/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@harness-monorepo/ui/components/select"
import { cn } from "@harness-monorepo/ui/lib/utils"

// Locales
import { defaultMessages, format } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import { ArrangeBoard, useArrangeItem } from "./design-arrange"

export type ArrangementLayout = "FULL" | "HALVES" | "THIRDS"

/**
 * The product bands, as a row in the same list.
 *
 * They are one row and not a boundary drawn between two lists, because a boundary is a thing you
 * push banners past one at a time. As a row it is dragged itself: moving it up once puts every
 * poster under it. It is the only id in this list that is not a banner's, and the screen reads it
 * back to decide which side each banner landed on.
 */
export const PRODUCTS_ROW_ID = "__products__"

/** The products as a list entry. Only its id is ever read; it carries no banner's fields. */
const PRODUCTS_ROW = { id: PRODUCTS_ROW_ID } as const

export interface ArrangementItem {
  id: string
  title: string
  imageUrl: string
  layout: ArrangementLayout
  isActive: boolean
}

export interface BannerArrangementProps {
  /** The posters above the product bands, in order. */
  items: readonly ArrangementItem[]
  /** The posters below them, in order. */
  itemsBelow?: readonly ArrangementItem[]
  /**
   * The whole list in its new order, `PRODUCTS_ROW_ID` included and in its place — which is what
   * says where the products ended up. The API accepts nothing less than every banner, so neither
   * does this.
   */
  onReorder: (ids: string[]) => void
  onToggle: (id: string, isActive: boolean) => void
  onLayoutChange: (id: string, layout: ArrangementLayout) => void
  messages?: UiMessages
}

/**
 * The banners, in the order the landing page draws them, draggable.
 *
 * It lives in this package and not in the app because `@dnd-kit` is a dependency of this package
 * and of nothing else: imported from `apps/web` it would resolve anyway through the hoisted
 * `node_modules` and be a phantom dependency — the first trap in the root contract. Here it is
 * declared where it is used, and the block stays props-in/callbacks-out.
 *
 * Dragging is not the only way to move a row. The keyboard sensor is wired with
 * `sortableKeyboardCoordinates` because the default one nudges by a fixed 25 pixels, which never
 * lands on the next row of a list whose rows are different heights — a drag that works only with a
 * mouse is one axe cannot catch and a shopkeeper on a trackpad meets immediately.
 */
export function BannerArrangement({
  items,
  itemsBelow = [],
  onReorder,
  onToggle,
  onLayoutChange,
  messages = defaultMessages,
}: BannerArrangementProps) {
  const text = messages.design

  // One list, with the products in it. Every id the sortable context knows lives here, in the
  // order the landing page draws them.
  const rows: readonly (ArrangementItem | { id: typeof PRODUCTS_ROW_ID })[] = [
    ...items,
    PRODUCTS_ROW,
    ...itemsBelow,
  ]

  /**
   * What a screen reader is told, in the shop's own words.
   *
   * dnd-kit ships English defaults. A shopkeeper driving this from a keyboard would otherwise hear
   * the one part of the panel that never learned their language.
   */
  const announcements: Announcements = {
    onDragStart: ({ active }) => format(text.dragStart, { name: nameOf(active.id) }),
    onDragOver: ({ active, over }) =>
      over ? format(text.dragOver, { name: nameOf(active.id), position: String(indexOf(over.id) + 1) }) : "",
    onDragEnd: ({ active, over }) =>
      over ? format(text.dragEnd, { name: nameOf(active.id), position: String(indexOf(over.id) + 1) }) : "",
    onDragCancel: ({ active }) => format(text.dragCancel, { name: nameOf(active.id) }),
  }

  function indexOf(id: string | number) {
    return rows.findIndex((row) => row.id === id)
  }

  function nameOf(id: string | number) {
    const row = rows[indexOf(id)]
    if (!row) return ""

    return "title" in row ? row.title : text.productList
  }

  if (!items.length && !itemsBelow.length) {
    return (
      <div className="flex flex-col items-center gap-1 rounded-xl border border-dashed py-10 text-center">
        <p className="font-medium">{text.empty}</p>
        <p className="text-muted-foreground text-sm">{text.emptyHint}</p>
      </div>
    )
  }

  return (
    <ArrangeBoard
      ids={rows.map((row) => row.id)}
      onReorder={onReorder}
      announcements={announcements}
    >
      <ul className="flex flex-col gap-2">
          {rows.map((row) =>
            "title" in row ? (
              <ArrangementRow
                key={row.id}
                item={row}
                onToggle={onToggle}
                onLayoutChange={onLayoutChange}
                messages={messages}
              />
            ) : (
              <ProductsRow key={row.id} messages={messages} />
            ),
        )}
      </ul>
    </ArrangeBoard>
  )
}

/**
 * The product bands, as a row that is dragged like any other.
 *
 * It has no eye and no size select: a shop's landing page without its products is not an
 * arrangement anyone wants, and "how wide" is a question about a poster, not about a rail.
 */
function ProductsRow({ messages }: { messages: UiMessages }) {
  const text = messages.design
  const drag = useArrangeItem(PRODUCTS_ROW_ID)

  return (
    <li
      ref={drag.setNodeRef}
      style={drag.style}
      className={cn(
        "border-primary/40 bg-primary/5 flex items-center gap-2 rounded-xl border border-dashed p-2",
        drag.isDragging && "z-10 opacity-80 shadow-md",
      )}
    >
      <button
        type="button"
        aria-label={`${text.dragHandle}: ${text.productList}`}
        className="text-muted-foreground hover:text-foreground cursor-grab touch-none rounded-md p-1"
        {...drag.handleProps}
      >
        <GripVerticalIcon aria-hidden="true" className="size-4" />
      </button>

      <span className="bg-primary/10 text-primary flex h-9 w-14 shrink-0 items-center justify-center rounded-md">
        <LayoutGridIcon aria-hidden="true" className="size-4" />
      </span>

      <div className="flex min-w-0 flex-1 flex-col">
        <p className="truncate text-sm font-medium">{text.productList}</p>
        <p className="text-muted-foreground truncate text-xs">{text.productListHint}</p>
      </div>
    </li>
  )
}

function ArrangementRow({
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
        aria-label={`${text.dragHandle}: ${item.title}`}
        className="text-muted-foreground hover:text-foreground cursor-grab touch-none rounded-md p-1"
        {...drag.handleProps}
      >
        <GripVerticalIcon aria-hidden="true" className="size-4" />
      </button>

      <span className="bg-muted h-9 w-14 shrink-0 overflow-hidden rounded-md">
        <img src={item.imageUrl} alt="" aria-hidden="true" className="size-full object-cover" />
      </span>

      <p className="min-w-0 flex-1 truncate text-sm font-medium">{item.title}</p>

      <Select
        value={item.layout}
        onValueChange={(next: string | null) => onLayoutChange(item.id, (next ?? "FULL") as ArrangementLayout)}
      >
        <SelectTrigger aria-label={`${text.sizeLabel}: ${item.title}`} className="w-28 shrink-0">
          <SelectValue>{(selected: string) => layoutLabel(selected)}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="FULL">{text.sizeFull}</SelectItem>
          <SelectItem value="HALVES">{text.sizeHalves}</SelectItem>
          <SelectItem value="THIRDS">{text.sizeThirds}</SelectItem>
        </SelectContent>
      </Select>

      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label={`${item.isActive ? text.hide : text.show}: ${item.title}`}
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
