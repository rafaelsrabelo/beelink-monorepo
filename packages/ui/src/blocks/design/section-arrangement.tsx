"use client"

// Libs
import type { Announcements } from "@dnd-kit/core"

// Locales
import { defaultMessages, format } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import { ArrangeBoard } from "./design-arrange"
import { ArrangementRow } from "./arrangement-row"
import type { ArrangementItem, ArrangementLayout } from "./arrangement-row"

// Re-exported, because the package's export map points `./blocks/*` at `.tsx` and apps/web reaches
// both through this block's name.
export type { ArrangementItem, ArrangementLayout }

export interface SectionArrangementProps {
  /** Every block the landing page has, in the order it draws them. Hidden ones included. */
  items: readonly ArrangementItem[]
  /**
   * The whole list in its new order. The API accepts nothing less — a partial one leaves the rows
   * it omits holding positions that now collide.
   */
  onReorder: (ids: string[]) => void
  onToggle: (id: string, isActive: boolean) => void
  onLayoutChange: (id: string, layout: ArrangementLayout) => void
  messages?: UiMessages
}

/**
 * The blocks of a landing page, in the order it draws them, draggable.
 *
 * It lives in this package and not in the app because `@dnd-kit` is a dependency of this package
 * and of nothing else: imported from `apps/web` it would resolve anyway through the hoisted
 * `node_modules` and be a phantom dependency — the first trap in the root contract. Here it is
 * declared where it is used, and the block stays props-in/callbacks-out.
 *
 * There is no special row any more. The product rails used to be a sentinel entry the screen read
 * a boolean off; they are an ordinary block with a position now, which is what the whole move from
 * a banners table to a sections table bought.
 */
export function SectionArrangement({
  items,
  onReorder,
  onToggle,
  onLayoutChange,
  messages = defaultMessages,
}: SectionArrangementProps) {
  const text = messages.design

  function indexOf(id: string | number) {
    return items.findIndex((item) => item.id === id)
  }

  function nameOf(id: string | number) {
    const item = items[indexOf(id)]
    return item ? (item.title?.trim() || text.kinds[item.kind]) : ""
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
      over ? format(text.dragOver, { name: nameOf(active.id), position: String(indexOf(over.id) + 1) }) : "",
    onDragEnd: ({ active, over }) =>
      over ? format(text.dragEnd, { name: nameOf(active.id), position: String(indexOf(over.id) + 1) }) : "",
    onDragCancel: ({ active }) => format(text.dragCancel, { name: nameOf(active.id) }),
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
    <ArrangeBoard
      ids={items.map((item) => item.id)}
      onReorder={onReorder}
      announcements={announcements}
    >
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
    </ArrangeBoard>
  )
}
