"use client"

// Locales
import { defaultMessages } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import { bandAnnouncements } from "../design/band-label"
import { ArrangeBoard } from "../design/design-arrange"
import { ProductOrderRow, type ProductOrderItem } from "./product-order-row"

export interface ProductOrderListProps {
  /** Every product of the shop, in the order being arranged. */
  items: readonly ProductOrderItem[]
  /** The whole list in its new order: the API that receives it wants all of them. */
  onReorder: (ids: string[]) => void
  disabled?: boolean
  messages?: UiMessages
}

/** The list with `id` at `to`, and everything else in the order it had. */
function placed(ids: readonly string[], id: string, to: number): string[] {
  const next = ids.filter((other) => other !== id)
  next.splice(to, 0, id)
  return next
}

/**
 * The shop's products in the order its window shows them, to be put in another.
 *
 * One column for every width, unlike the panel's table: a row dragged inside a table that scrolls
 * sideways on a phone fights the scroll for the same finger. And the whole catalogue, unpaged and
 * unfiltered, because a position only means something among all the others.
 */
export function ProductOrderList({ items, onReorder, disabled = false, messages = defaultMessages }: ProductOrderListProps) {
  const ids = items.map((item) => item.id)
  const last = ids.length - 1

  return (
    <ArrangeBoard ids={ids} onReorder={onReorder} announcements={bandAnnouncements(items, messages)}>
      <ol className="flex flex-col gap-2">
        {items.map((item, at) => (
          <ProductOrderRow
            key={item.id}
            item={item}
            onTop={at > 0 ? () => onReorder(placed(ids, item.id, 0)) : undefined}
            onUp={at > 0 ? () => onReorder(placed(ids, item.id, at - 1)) : undefined}
            onDown={at < last ? () => onReorder(placed(ids, item.id, at + 1)) : undefined}
            disabled={disabled}
            messages={messages}
          />
        ))}
      </ol>
    </ArrangeBoard>
  )
}
