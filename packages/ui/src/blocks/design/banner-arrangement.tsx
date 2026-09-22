"use client"

// React
import { useId } from "react"

// Libs
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type Announcements,
  type DragEndEvent,
} from "@dnd-kit/core"
import { restrictToParentElement, restrictToVerticalAxis } from "@dnd-kit/modifiers"
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { EyeIcon, EyeOffIcon, GripVerticalIcon } from "lucide-react"

// UI
import { Button } from "@harness-monorepo/ui/components/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@harness-monorepo/ui/components/select"
import { cn } from "@harness-monorepo/ui/lib/utils"

// Locales
import { defaultMessages, format } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

export type ArrangementLayout = "FULL" | "HALVES" | "THIRDS"

export interface ArrangementItem {
  id: string
  title: string
  imageUrl: string
  layout: ArrangementLayout
  isActive: boolean
}

export interface BannerArrangementProps {
  items: readonly ArrangementItem[]
  /** The whole list in its new order. The API accepts nothing less, so neither does this. */
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
  onReorder,
  onToggle,
  onLayoutChange,
  messages = defaultMessages,
}: BannerArrangementProps) {
  const text = messages.design
  const context = useId()

  const sensors = useSensors(
    // A small distance before a drag starts, so a click on the eye or the size select is a click.
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

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
    return items.findIndex((item) => item.id === id)
  }

  function nameOf(id: string | number) {
    return items[indexOf(id)]?.title ?? ""
  }

  function handleEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const from = indexOf(active.id)
    const to = indexOf(over.id)
    if (from < 0 || to < 0) return

    const ids = items.map((item) => item.id)
    const [moved] = ids.splice(from, 1)
    if (moved) ids.splice(to, 0, moved)

    onReorder(ids)
  }

  if (!items.length) {
    return (
      <div className="flex flex-col items-center gap-1 rounded-xl border border-dashed py-10 text-center">
        <p className="font-medium">{text.empty}</p>
        <p className="text-muted-foreground text-sm">{text.emptyHint}</p>
      </div>
    )
  }

  return (
    <DndContext
      id={context}
      sensors={sensors}
      collisionDetection={closestCenter}
      // Vertical only, and inside the list: a poster cannot be dragged sideways into nothing, and
      // it cannot be dragged out of the panel it belongs to.
      modifiers={[restrictToVerticalAxis, restrictToParentElement]}
      accessibility={{ announcements }}
      onDragEnd={handleEnd}
    >
      <SortableContext items={items.map((item) => item.id)} strategy={verticalListSortingStrategy}>
        <ul className="flex flex-col gap-2">
          {items.map((item) => (
            <ArrangementRow
              key={item.id}
              item={item}
              onToggle={onToggle}
              onLayoutChange={onLayoutChange}
              messages={messages}
            />
          ))}
        </ul>
      </SortableContext>
    </DndContext>
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
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id })

  const layoutLabel = (layout: string) =>
    layout === "HALVES" ? text.sizeHalves : layout === "THIRDS" ? text.sizeThirds : text.sizeFull

  return (
    <li
      ref={setNodeRef}
      // `CSS.Transform.toString` turns dnd-kit's {x, y, scaleX, scaleY} into the string the browser
      // wants. The transition comes from the hook too, so a dropped row settles instead of jumping.
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        "bg-shell-surface border-shell-border flex items-center gap-2 rounded-xl border p-2",
        isDragging && "z-10 opacity-80 shadow-md",
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
        {...attributes}
        {...listeners}
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
