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
import type { ArrangementBand } from "./band-arrangement"
import { besideInBand, type BesideInBand } from "./band-beside"
import type { BesideActionsProps } from "./beside-actions"
import { bandLabelOf } from "./band-label"
import { InsertPoint } from "./insert-point"
import { SingleBlockCard, singleShown } from "./single-block-card"

/**
 * One band of the page: its own controls, and the components inside it — or, while it holds one
 * block, the single card that is both (`SingleBlockCard`).
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
  onDelete,
  onEdit,
  onInsertBlock,
  onInsertBeside,
  joinAbove = null,
  inserting = false,
  selectedId = null,
  selected = false,
  messages,
}: {
  band: ArrangementBand
  position: number
  onReorderComponents: (sectionId: string, ids: string[]) => void
  onToggleBand: (id: string, isActive: boolean) => void
  /** The header, or a lone block's swatch: the band's Estilo, in the panel. */
  onEditBand: (id: string) => void
  onDeleteBand: (id: string) => void
  onToggle: (id: string, isActive: boolean) => void
  onDelete: (id: string) => void
  onEdit: (id: string) => void
  /**
   * A "+" inside this band was pressed, at `index` among its blocks.
   *
   * It is what makes "metade" and "um terço" reachable at all: blocks share a row only inside ONE
   * band's grid (`StorefrontBandGrid`), and every other way of adding a block wraps it in a band of
   * its own — so a third-width poster was always alone in its row, drawn a third wide with two
   * thirds of nothing beside it.
   */
  onInsertBlock?: (index: number) => void
  /** A block beside another, with the slice it takes and the room its row gives up. */
  onInsertBeside?: (at: BesideInBand) => void
  /** This band's only block, moved beside the last block of the band above. */
  joinAbove?: BesideActionsProps["joinAbove"]
  inserting?: boolean
  /** The block whose fields are open. */
  selectedId?: string | null
  /** The band itself is chosen, on its own. */
  selected?: boolean
  messages: UiMessages
}) {
  const text = messages.design
  const drag = useArrangeItem(band.id)
  const name = bandLabelOf(band.name, position, messages)
  const insertLabel = (index: number) =>
    format(text.insertBlock, { band: name, position: String(index + 1) })
  const [only] = band.components
  const single = only && band.components.length === 1 ? only : null
  const marked = selected || (!!single && single.id === selectedId)
  const besideAt = (at: number) => {
    const id = band.components[at]?.id
    const beside = onInsertBeside && id ? besideInBand(band.components, id) : null
    return onInsertBeside && beside ? { onAddBeside: () => onInsertBeside(beside) } : {}
  }

  return (
    <li
      ref={drag.setNodeRef}
      style={drag.style}
      // The single card is the selected block itself, so the band's item carries the mark.
      {...(marked ? { "aria-current": "true" as const } : {})}
      className={cn(
        "bg-shell-surface border-shell-border flex flex-col gap-2 rounded-xl border p-2",
        drag.isDragging && "z-10 opacity-80 shadow-md",
        !(single ? singleShown(band, single) : band.isActive) && "opacity-60",
        marked && "ring-primary ring-2",
      )}
    >
      {/*
        One <li> and one add slot whichever the band is, so a card that gains its second block
        becomes a container around the same nodes: the add button that was just pressed stays the
        focused element instead of being unmounted under the keyboard.
      */}
      {single ? (
        <SingleBlockCard
          band={band}
          block={single}
          bandName={name}
          selected={single.id === selectedId}
          drag={drag}
          onToggleBand={onToggleBand}
          onEditBand={onEditBand}
          onDeleteBand={onDeleteBand}
          onToggle={onToggle}
          onEdit={onEdit}
          {...besideAt(0)}
          joinAbove={joinAbove}
          inserting={inserting}
          messages={messages}
        />
      ) : (
        <>
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
              data-design-node={band.id}
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

            {/*
              No bin on a band holding a row that cannot go. The product list's own row already draws
              none, and a bin on its band was the same delete through a bigger door — which is exactly
              how a shop lost its shelves. The eye stays: hiding is the answer for "not now".
            */}
            {band.components.every((component) => component.deletable !== false) ? (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={`${text.deleteBand}: ${name}`}
                onClick={() => onDeleteBand(band.id)}
              >
                <Trash2Icon aria-hidden="true" className="size-4" />
              </Button>
            ) : null}
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
            <ul className={cn("flex flex-col pl-6", !onInsertBlock && "gap-2")}>
              {band.components.flatMap((component, at) => [
                onInsertBlock ? (
                  <InsertPoint
                    key={`insert-${at}`}
                    label={insertLabel(at)}
                    disabled={inserting}
                    className="h-2"
                    onInsert={() => onInsertBlock(at)}
                  />
                ) : null,
                <ArrangementRow
                  key={component.id}
                  item={component}
                  selected={component.id === selectedId}
                  onToggle={onToggle}
                  onDelete={onDelete}
                  onEdit={onEdit}
                  {...besideAt(at)}
                  inserting={inserting}
                  messages={messages}
                />,
              ])}
            </ul>
          </ArrangeBoard>
        </>
      )}

      {/*
        The band's last "+", the same node whether the band is a card or a container: a card that
        gains its second block through it keeps the focus on it instead of losing it to a remount.
      */}
      {onInsertBlock ? (
        <InsertPoint
          as="div"
          label={insertLabel(band.components.length)}
          disabled={inserting}
          className={cn(!single && "pl-6")}
          onInsert={() => onInsertBlock(band.components.length)}
        />
      ) : null}
    </li>
  )
}
