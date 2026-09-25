"use client"

// Libs
import { EyeIcon, EyeOffIcon, GripVerticalIcon, PaletteIcon, Trash2Icon } from "lucide-react"

// UI
import { Button } from "@harness-monorepo/ui/components/button"

// Locales
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import { hasSpan, type ArrangementItem, type ArrangementSpan } from "./arrangement-row"
import type { ArrangementBand } from "./band-arrangement"
import { BesideActions, type BesideActionsProps } from "./beside-actions"
import type { useArrangeItem } from "./design-arrange"
import { RowThumbnail } from "./row-thumbnail"
import { SpanField } from "./span-field"

export interface SingleBlockCardProps {
  band: ArrangementBand
  block: ArrangementItem
  /** What the band is called: its name, or its place. */
  bandName: string
  /** Its fields are open. The band's item draws the mark; this says so to the name. */
  selected?: boolean
  /** The band's handle on the board of bands — the card is that band's item there. */
  drag: ReturnType<typeof useArrangeItem>
  onToggleBand: (id: string, isActive: boolean) => void
  onEditBand: (id: string) => void
  onDeleteBand: (id: string) => void
  onToggle: (id: string, isActive: boolean) => void
  onSpanChange: (id: string, span: ArrangementSpan) => void
  onEdit: (id: string) => void
  /** See `BesideActions`: absent when the row has no room, null when there is nothing above to join. */
  onAddBeside?: () => void
  joinAbove?: BesideActionsProps["joinAbove"]
  inserting?: boolean
  messages: UiMessages
}

/** Whether a one-block band shows on the page: both it and its block have to. */
export function singleShown(band: Pick<ArrangementBand, "isActive">, block: Pick<ArrangementItem, "isActive">): boolean {
  return band.isActive && block.isActive
}

/**
 * A band that holds one block, as the one thing it is to the owner.
 *
 * All five bands of the real shop this editor was measured on hold a single block, and each drew
 * as a container with one child: two handles, two eyes and two bins for one thing on the page. The
 * card keeps the block's face — its picture, its name, its width — and the band's reach: the handle
 * moves the band, the swatch opens the band's sheet, and the bin deletes the band, because the API
 * would otherwise leave an empty band behind. It becomes a container the moment a second block
 * arrives. It is the inside of the band's `<li>`, which `BandRow` keeps, so the add slot below it is
 * the same element before and after — a keyboard user adding the second block keeps their place.
 *
 * One eye, open only while both are shown, since a hidden band and a hidden block are the same shop.
 * Closing hides the band; opening shows the band, and the block too if it had been hidden on its own.
 */
export function SingleBlockCard({
  band,
  block,
  bandName,
  selected = false,
  drag,
  onToggleBand,
  onEditBand,
  onDeleteBand,
  onToggle,
  onSpanChange,
  onEdit,
  onAddBeside,
  joinAbove = null,
  inserting = false,
  messages,
}: SingleBlockCardProps) {
  const text = messages.design
  const name = block.title?.trim() || text.kinds[block.kind]
  const shown = singleShown(band, block)

  const toggle = () => {
    if (shown) return onToggleBand(band.id, false)
    if (!band.isActive) onToggleBand(band.id, true)
    if (!block.isActive) onToggle(block.id, true)
  }

  return (
    <>
      <div className="flex items-center gap-2">
        <button
          type="button"
          aria-label={`${text.dragHandle}: ${bandName}`}
          className="text-muted-foreground hover:text-foreground cursor-grab touch-none rounded-md p-1"
          {...drag.handleProps}
        >
          <GripVerticalIcon aria-hidden="true" className="size-4" />
        </button>

        <RowThumbnail kind={block.kind} imageUrl={block.imageUrl ?? null} />

        <button
          type="button"
          onClick={() => onEdit(block.id)}
          className="focus-visible:ring-ring flex min-w-0 flex-1 flex-col rounded-md px-1 text-left outline-none hover:underline focus-visible:ring-2"
        >
          <span className="truncate text-sm font-medium">{name}</span>
          <span className="text-muted-foreground truncate text-xs">
            {bandName} · {block.empty ? text.emptyBlock : text.kinds[block.kind]}
          </span>
        </button>

        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={`${text.editBand}: ${bandName}`}
          onClick={() => onEditBand(band.id)}
        >
          {/* The colour itself, not its name: a hex is data the shopkeeper chose and cannot read back. */}
          <span
            aria-hidden="true"
            className="border-shell-border flex size-4 items-center justify-center rounded-full border"
            {...(band.background ? { style: { backgroundColor: band.background } } : {})}
          >
            {band.background ? null : <PaletteIcon className="text-muted-foreground size-4" />}
          </span>
        </Button>

        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={`${shown ? text.hide : text.show}: ${name}`}
          aria-pressed={shown}
          onClick={toggle}
        >
          {shown ? <EyeIcon aria-hidden="true" className="size-4" /> : <EyeOffIcon aria-hidden="true" className="size-4" />}
        </Button>

        {block.deletable !== false ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={`${text.deleteBlock}: ${name}`}
            onClick={() => onDeleteBand(band.id)}
          >
            <Trash2Icon aria-hidden="true" className="size-4" />
          </Button>
        ) : null}
      </div>

      {hasSpan(block) ? (
        <SpanField
          value={block.span}
          onChange={(span) => onSpanChange(block.id, span)}
          name={name}
          {...(band.width ? { bandWidth: band.width } : {})}
          messages={messages}
        />
      ) : null}

      <BesideActions name={name} {...(onAddBeside ? { onAddBeside } : {})} joinAbove={joinAbove} disabled={inserting} messages={messages} />
    </>
  )
}
