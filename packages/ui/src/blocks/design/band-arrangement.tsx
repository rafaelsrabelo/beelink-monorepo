"use client"

// Libs
import { PlusIcon } from "lucide-react"

// UI
import { Button } from "@harness-monorepo/ui/components/button"
import { cn } from "@harness-monorepo/ui/lib/utils"

// Locales
import { defaultMessages, format } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import { ArrangeBoard } from "./design-arrange"
import { bandAnnouncements } from "./band-label"
import { InsertPoint } from "./insert-point"
import { BandRow } from "./band-row"
import type { ArrangementItem, ArrangementSpan } from "./arrangement-row"
import type { SectionWidth } from "./design-types"

// Re-exported, because the package's export map points `./blocks/*` at `.tsx` and apps/web reaches
// both through this block's name.
export type { ArrangementItem, ArrangementSpan }

export interface ArrangementBand {
  id: string
  /** What the band is called on the page, if named. The row is called by it; else by its place. */
  name?: string | null
  /** The band's own colour, drawn as a chip. Null is the page's own. */
  background?: string | null
  /** Edge to edge, or inside the page's measure — said beside each block's own width. */
  width?: SectionWidth
  isActive: boolean
  components: readonly ArrangementItem[]
}

export interface BandArrangementProps {
  /** Every band of the landing page, in the order it draws them. Hidden ones included. */
  bands: readonly ArrangementBand[]
  /** The whole list of bands in its new order. The API accepts nothing less. */
  onReorder: (ids: string[]) => void
  /** One band's components in their new order. Never across two bands — see the block doc. */
  onReorderComponents: (sectionId: string, ids: string[]) => void
  onToggleBand: (id: string, isActive: boolean) => void
  onEditBand: (id: string) => void
  onDeleteBand: (id: string) => void
  onToggle: (id: string, isActive: boolean) => void
  onSpanChange: (id: string, span: ArrangementSpan) => void
  onDelete: (id: string) => void
  onEdit: (id: string) => void
  /**
   * A "+" was pressed: a new band at `index` among the bands, or a new block at `index` inside one
   * band — the only way two blocks end up side by side. Without it the panel offers no "+".
   */
  onInsert?: (at: InsertAt) => void
  /** While an add is on its way, so a second "+" does not start a second one. */
  inserting?: boolean
  /** The block whose fields are open, marked here as the preview marks it. */
  selectedId?: string | null
  messages?: UiMessages
}

/** Where a "+" inserts: among the bands, or inside one of them. Indices count from 0. */
export type InsertAt = { level: "band"; index: number } | { level: "block"; sectionId: string; index: number }

/**
 * The landing page at both of its levels: bands in order, and what is inside each one.
 *
 * **A component cannot be dragged from one band into another, and that is a deliberate first
 * cut.** Crossing contexts is the hard half of a two-level editor and the half that makes one feel
 * confused — which was, word for word, the criticism that produced this shape. Moving a component
 * between bands arrives next, on its own, rather than half-working now.
 *
 * It lives in this package and not in the app because `@dnd-kit` is a dependency of this package
 * and of nothing else: imported from `apps/web` it would resolve anyway through the hoisted
 * `node_modules` and be a phantom dependency — the first trap in the root contract.
 */
export function BandArrangement({
  bands,
  onReorder,
  onReorderComponents,
  onToggleBand,
  onEditBand,
  onDeleteBand,
  onToggle,
  onSpanChange,
  onDelete,
  onEdit,
  onInsert,
  inserting = false,
  selectedId = null,
  messages = defaultMessages,
}: BandArrangementProps) {
  const text = messages.design

  const announcements = bandAnnouncements(bands, messages)

  if (!bands.length) {
    return (
      <div className="flex flex-col items-center gap-1 rounded-xl border border-dashed py-10 text-center">
        <p className="font-medium">{text.empty}</p>
        <p className="text-muted-foreground text-sm">{text.emptyHint}</p>
        {/* A page with no band has nothing to put a "+" between: its first band has a button. */}
        {onInsert ? (
          <Button
            type="button"
            variant="outline"
            className="mt-3"
            disabled={inserting}
            onClick={() => onInsert({ level: "band", index: 0 })}
          >
            <PlusIcon aria-hidden="true" className="size-4" />
            {text.addBlock}
          </Button>
        ) : null}
      </div>
    )
  }

  const insertBand = (index: number) =>
    onInsert ? (
      <InsertPoint
        key={`insert-${index}`}
        label={format(text.insertBand, { position: String(index + 1) })}
        disabled={inserting}
        onInsert={() => onInsert({ level: "band", index })}
      />
    ) : null

  return (
    <ArrangeBoard
      ids={bands.map((band) => band.id)}
      onReorder={onReorder}
      announcements={announcements}
    >
      {/* The "+" between bands are the gaps between them, so the list has none of its own. */}
      <ul className={cn("flex flex-col", !onInsert && "gap-3")}>
        {bands.flatMap((band, at) => [
          insertBand(at),
          <BandRow
            key={band.id}
            band={band}
            position={at + 1}
            onReorderComponents={onReorderComponents}
            onToggleBand={onToggleBand}
            onEditBand={onEditBand}
            onDeleteBand={onDeleteBand}
            onToggle={onToggle}
            onSpanChange={onSpanChange}
            onDelete={onDelete}
            onEdit={onEdit}
            {...(onInsert
              ? { onInsertBlock: (index: number) => onInsert({ level: "block", sectionId: band.id, index }) }
              : {})}
            inserting={inserting}
            selectedId={selectedId}
            messages={messages}
          />,
        ])}
        {/* The foot of the page is a button in sight, not a "+" revealed on hover: with a mouse, a
            page whose every "+" waits for the pointer shows no way to add anything at all. */}
        {onInsert ? (
          <li key="insert-end" className="pt-3">
            <Button
              type="button"
              variant="outline"
              // Inset: the panel scrolls, and a ring drawn outside the button would be clipped on three sides.
              className="w-full border-dashed focus-visible:ring-inset"
              aria-label={format(text.insertBand, { position: String(bands.length + 1) })}
              disabled={inserting}
              onClick={() => onInsert({ level: "band", index: bands.length })}
            >
              <PlusIcon aria-hidden="true" className="size-4" />
              {text.addBand}
            </Button>
          </li>
        ) : null}
      </ul>
    </ArrangeBoard>
  )
}
