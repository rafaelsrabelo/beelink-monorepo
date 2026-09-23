"use client"

// Libs
import type { Announcements } from "@dnd-kit/core"

// Locales
import { defaultMessages, format } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import { ArrangeBoard } from "./design-arrange"
import { BandRow } from "./band-row"
import type { ArrangementItem, ArrangementLayout } from "./arrangement-row"

// Re-exported, because the package's export map points `./blocks/*` at `.tsx` and apps/web reaches
// both through this block's name.
export type { ArrangementItem, ArrangementLayout }

export interface ArrangementBand {
  id: string
  /** The band's own colour, drawn as a chip. Null is the page's own. */
  background?: string | null
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
  onLayoutChange: (id: string, layout: ArrangementLayout) => void
  onDelete: (id: string) => void
  onEdit: (id: string) => void
  messages?: UiMessages
}

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
  onLayoutChange,
  onDelete,
  onEdit,
  messages = defaultMessages,
}: BandArrangementProps) {
  const text = messages.design

  function nameOf(id: string | number) {
    const at = bands.findIndex((band) => band.id === id)
    return at < 0 ? "" : format(text.bandNumber, { position: String(at + 1) })
  }

  /**
   * What a screen reader is told, in the shop's own words.
   *
   * dnd-kit ships English defaults. A shopkeeper driving this from a keyboard would otherwise hear
   * the one part of the panel that never learned their language.
   */
  const announcements: Announcements = {
    onDragStart: ({ active }) => format(text.dragStart, { name: nameOf(active.id) }),
    onDragOver: ({ active, over }) =>
      over ? format(text.dragOver, { name: nameOf(active.id), position: nameOf(over.id) }) : "",
    onDragEnd: ({ active, over }) =>
      over ? format(text.dragEnd, { name: nameOf(active.id), position: nameOf(over.id) }) : "",
    onDragCancel: ({ active }) => format(text.dragCancel, { name: nameOf(active.id) }),
  }

  if (!bands.length) {
    return (
      <div className="flex flex-col items-center gap-1 rounded-xl border border-dashed py-10 text-center">
        <p className="font-medium">{text.empty}</p>
        <p className="text-muted-foreground text-sm">{text.emptyHint}</p>
      </div>
    )
  }

  return (
    <ArrangeBoard
      ids={bands.map((band) => band.id)}
      onReorder={onReorder}
      announcements={announcements}
    >
      <ul className="flex flex-col gap-3">
        {bands.map((band, at) => (
          <BandRow
            key={band.id}
            band={band}
            position={at + 1}
            onReorderComponents={onReorderComponents}
            onToggleBand={onToggleBand}
            onEditBand={onEditBand}
            onDeleteBand={onDeleteBand}
            onToggle={onToggle}
            onLayoutChange={onLayoutChange}
            onDelete={onDelete}
            onEdit={onEdit}
            messages={messages}
          />
        ))}
      </ul>
    </ArrangeBoard>
  )
}
