"use client"

// Libs
import type { Announcements } from "@dnd-kit/core"
// Locales
import { defaultMessages, format } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import { ArrangeBoard } from "./design-arrange"
import { ArrangementRow, ProductsRow, PRODUCTS_ROW, PRODUCTS_ROW_ID } from "./arrangement-row"
import type { ArrangementItem, ArrangementLayout } from "./arrangement-row"

// Re-exported, because the package's export map points `./blocks/*` at `.tsx` and apps/web reaches
// all three through this block's name.
export { PRODUCTS_ROW_ID }
export type { ArrangementItem, ArrangementLayout }


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
