"use client"

// Locales
import { defaultLocale, defaultMessages } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import type { LinkComponent } from "../auth/auth-link"
import { bandAnnouncements } from "../design/band-label"
import { ArrangeBoard } from "../design/design-arrange"
import { ProductOrderPoster } from "./product-order-poster"
import type { ProductOrderItem } from "./product-order-row"

export interface ProductOrderShelfProps {
  /** Every product of the shop, in the order being arranged. */
  items: readonly ProductOrderItem[]
  /** The whole list in its new order: the API that receives it wants all of them. */
  onReorder: (ids: string[]) => void
  linkComponent: LinkComponent
  locale?: string
  disabled?: boolean
  messages?: UiMessages
}

/**
 * The same order as `ProductOrderList`, drawn as the shop window draws it: the shop's own cards, in
 * the columns of a showcase's grid. The `--shop-*` variables those cards read come from the screen,
 * which knows the shop's palette.
 *
 * It is the whole catalogue, so drafts and sold-out products are here, marked, though a visitor will
 * not see them: they keep their place among the others.
 */
export function ProductOrderShelf({
  items,
  onReorder,
  linkComponent,
  locale = defaultLocale,
  disabled = false,
  messages = defaultMessages,
}: ProductOrderShelfProps) {
  return (
    <ArrangeBoard ids={items.map((item) => item.id)} onReorder={onReorder} announcements={bandAnnouncements(items, messages)} layout="grid">
      <div className="@container">
        <ol className="grid grid-cols-2 gap-4 @xl:grid-cols-3 @3xl:grid-cols-4">
          {items.map((item) => (
            <ProductOrderPoster key={item.id} item={item} locale={locale} linkComponent={linkComponent} disabled={disabled} messages={messages} />
          ))}
        </ol>
      </div>
    </ArrangeBoard>
  )
}
