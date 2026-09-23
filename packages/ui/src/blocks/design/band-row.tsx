"use client"

// Libs
import { EyeIcon, EyeOffIcon, GripVerticalIcon, PaletteIcon, Trash2Icon } from "lucide-react"

// UI
import { Button } from "@harness-monorepo/ui/components/button"
import { cn } from "@harness-monorepo/ui/lib/utils"

// Locales
import { format } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import { ArrangeBoard, useArrangeItem } from "./design-arrange"
import { ArrangementRow } from "./arrangement-row"
import type { ArrangementLayout } from "./arrangement-row"
import type { ArrangementBand } from "./band-arrangement"

/**
 * One band of the page: its own controls, and the components inside it.
 *
 * Its own file because the board it came out of had reached the line limit, and the split falls
 * where the responsibility does — the board owns the order of the bands, and this owns what one
 * band looks like.
 */
export function BandRow({
  band,
  position,
  onReorderComponents,
  onToggleBand,
  onEditBand,
  onDeleteBand,
  onToggle,
  onLayoutChange,
  onDelete,
  onEdit,
  messages,
}: {
  band: ArrangementBand
  position: number
  onReorderComponents: (sectionId: string, ids: string[]) => void
  onToggleBand: (id: string, isActive: boolean) => void
  onEditBand: (id: string) => void
  onDeleteBand: (id: string) => void
  onToggle: (id: string, isActive: boolean) => void
  onLayoutChange: (id: string, layout: ArrangementLayout) => void
  onDelete: (id: string) => void
  onEdit: (id: string) => void
  messages: UiMessages
}) {
  const text = messages.design
  const drag = useArrangeItem(band.id)
  const name = format(text.bandNumber, { position: String(position) })

  return (
    <li
      ref={drag.setNodeRef}
      style={drag.style}
      className={cn(
        "bg-shell-surface border-shell-border flex flex-col gap-2 rounded-xl border p-2",
        drag.isDragging && "z-10 opacity-80 shadow-md",
        !band.isActive && "opacity-60",
      )}
    >
      <div className="flex items-center gap-1">
        {/*
          The handle carries the drag, and it carries `attributes` with it: dnd-kit puts the role,
          the tab stop and the described-by on whatever it is spread onto, so splitting them from
          the listeners would leave a control that announces as draggable and cannot be driven.
        */}
        <button
          type="button"
          aria-label={`${text.dragHandle}: ${name}`}
          className="text-muted-foreground hover:text-foreground cursor-grab touch-none rounded-md p-1"
          {...drag.handleProps}
        >
          <GripVerticalIcon aria-hidden="true" className="size-4" />
        </button>

        <button
          type="button"
          onClick={() => onEditBand(band.id)}
          className="focus-visible:ring-ring flex min-w-0 flex-1 items-center gap-2 rounded-md px-1 py-1 text-left outline-none hover:underline focus-visible:ring-2"
        >
          {/* The colour itself, not its name: a hex is data the shopkeeper chose and cannot read back. */}
          <span
            aria-hidden="true"
            className="border-shell-border size-4 shrink-0 rounded-full border"
            {...(band.background ? { style: { backgroundColor: band.background } } : {})}
          >
            {band.background ? null : <PaletteIcon className="text-muted-foreground size-4" />}
          </span>
          <span className="text-muted-foreground truncate text-xs font-medium uppercase">{name}</span>
        </button>

        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={`${band.isActive ? text.hide : text.show}: ${name}`}
          aria-pressed={band.isActive}
          onClick={() => onToggleBand(band.id, !band.isActive)}
        >
          {band.isActive ? (
            <EyeIcon aria-hidden="true" className="size-4" />
          ) : (
            <EyeOffIcon aria-hidden="true" className="size-4" />
          )}
        </Button>

        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={`${text.deleteBand}: ${name}`}
          onClick={() => onDeleteBand(band.id)}
        >
          <Trash2Icon aria-hidden="true" className="size-4" />
        </Button>
      </div>

      {/*
        A board per band, nested inside the one that orders the bands. Nested and not shared: a
        single context would make every component of every band a drop target for every other,
        which is the move this cut defers.
      */}
      <ArrangeBoard
        ids={band.components.map((component) => component.id)}
        onReorder={(ids) => onReorderComponents(band.id, ids)}
      >
        <ul className="flex flex-col gap-2 pl-6">
          {band.components.map((component) => (
            <ArrangementRow
              key={component.id}
              item={component}
              onToggle={onToggle}
              onLayoutChange={onLayoutChange}
              onDelete={onDelete}
              onEdit={onEdit}
              messages={messages}
            />
          ))}
        </ul>
      </ArrangeBoard>
    </li>
  )
}
