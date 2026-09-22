"use client"

// React
import { createContext, useContext, useId, type CSSProperties, type ReactNode } from "react"

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
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"

/**
 * How much the surface under this board is painted down by, or 1 where it is not.
 *
 * It exists because dnd-kit moves a dragged element with a `translate` **inside** that element's
 * own box, and a box inside `transform: scale(0.5)` paints every one of those pixels at half size.
 * The pointer is not scaled. Left alone, a poster in the preview crawls at half the speed of the
 * finger dragging it and never reaches where it is being put. Dividing the translate by the scale
 * is what puts the two back in the same units.
 *
 * Collision detection needs no such correction: dnd-kit measures with `getBoundingClientRect`,
 * which already reports the painted rectangle.
 */
const ScaleContext = createContext(1)

export function ArrangeScale({ scale, children }: { scale: number; children: ReactNode }) {
  return <ScaleContext.Provider value={scale}>{children}</ScaleContext.Provider>
}

export interface ArrangeBoardProps {
  /** Every id this board can order, in the order it currently draws them. */
  ids: readonly string[]
  /** The whole list in its new order. Never a pair — the API that receives it wants all of them. */
  onReorder: (ids: string[]) => void
  announcements?: Announcements
  /**
   * How the things being ordered are laid out, which decides two different answers.
   *
   * `"list"` is a column: movement is pinned to the vertical axis and inside the panel, because a
   * row dragged sideways is a row going nowhere. `"grid"` is the shop itself, where two posters
   * sit side by side — pinning that to one axis would make the poster on the right unreachable.
   */
  layout?: "list" | "grid"
  children: ReactNode
}

/**
 * One sortable board. There are two on the design screen, over the same ids: the editor's list and
 * the shop preview itself.
 *
 * Two boards and not one spanning both, on purpose. A single context would make the preview and
 * the list each other's drop targets, so a poster could be dragged out of the shop and into the
 * sidebar — a gesture with no meaning that dnd-kit would nonetheless animate. Two boards over the
 * same ids, both calling the same `onReorder`, are each self-consistent and cannot do that.
 *
 * This lives here because `@dnd-kit` is a dependency of this package and of nothing else: reached
 * from `apps/web` it would resolve through the hoisted `node_modules` and be a phantom dependency,
 * the first trap in the root contract.
 */
export function ArrangeBoard({
  ids,
  onReorder,
  announcements,
  layout = "list",
  children,
}: ArrangeBoardProps) {
  const context = useId()

  const sensors = useSensors(
    // A small distance before a drag starts, so a click on a control inside a row is a click.
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    // `sortableKeyboardCoordinates` and not the default: that one nudges by a fixed 25 pixels,
    // which never lands on the next row of a list whose rows are different heights. A drag that
    // works only with a mouse is one axe cannot catch and a trackpad meets immediately.
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  function handleEnd({ active, over }: DragEndEvent) {
    if (!over || active.id === over.id) return

    const from = ids.indexOf(String(active.id))
    const to = ids.indexOf(String(over.id))
    if (from < 0 || to < 0) return

    const next = [...ids]
    const [moved] = next.splice(from, 1)
    if (moved) next.splice(to, 0, moved)

    onReorder(next)
  }

  return (
    <DndContext
      id={context}
      sensors={sensors}
      collisionDetection={closestCenter}
      {...(layout === "list" ? { modifiers: [restrictToVerticalAxis, restrictToParentElement] } : {})}
      {...(announcements ? { accessibility: { announcements } } : {})}
      onDragEnd={handleEnd}
    >
      <SortableContext
        items={[...ids]}
        strategy={layout === "list" ? verticalListSortingStrategy : rectSortingStrategy}
      >
        {children}
      </SortableContext>
    </DndContext>
  )
}

export interface ArrangeHandle {
  setNodeRef: (node: HTMLElement | null) => void
  /** Spread onto the grab handle. Both together — dnd-kit puts the role and the tab stop here. */
  handleProps: Record<string, unknown>
  style: CSSProperties
  isDragging: boolean
}

/**
 * One draggable thing, without an opinion about what it looks like.
 *
 * A hook and not a wrapper component, because the two callers draw nothing alike: the editor's row
 * is a list item with a grip, and the preview's poster is the shop's own card with a handle
 * floating over it. A wrapper would have had to take a `className` for each of them and would
 * still have forced one element type on both.
 */
export function useArrangeItem(id: string): ArrangeHandle {
  const scale = useContext(ScaleContext)
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })

  return {
    setNodeRef,
    handleProps: { ...attributes, ...listeners },
    style: {
      // Written out rather than `CSS.Transform.toString`, which cannot divide. Tailwind 4 uses the
      // `translate` property, so this one has to be `transform` explicitly or the two fight.
      ...(transform
        ? { transform: `translate3d(${transform.x / scale}px, ${transform.y / scale}px, 0)` }
        : {}),
      ...(transition ? { transition } : {}),
    },
    isDragging,
  }
}
