"use client"

// Libs
import { EyeIcon, EyeOffIcon, GripVerticalIcon, LayoutGridIcon } from "lucide-react"

// UI
import { Button } from "@harness-monorepo/ui/components/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@harness-monorepo/ui/components/select"
import { cn } from "@harness-monorepo/ui/lib/utils"

// Locales
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import { useArrangeItem } from "./design-arrange"

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
export const PRODUCTS_ROW = { id: PRODUCTS_ROW_ID } as const

export interface ArrangementItem {
  id: string
  title: string
  imageUrl: string
  layout: ArrangementLayout
  isActive: boolean
}

/**
 * The product bands, as a row that is dragged like any other.
 *
 * It has no eye and no size select: a shop's landing page without its products is not an
 * arrangement anyone wants, and "how wide" is a question about a poster, not about a rail.
 */
export function ProductsRow({ messages }: { messages: UiMessages }) {
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
