"use client"

// Libs
import { GripVerticalIcon } from "lucide-react"

// UI
import { Badge } from "@harness-monorepo/ui/components/badge"
import { cn } from "@harness-monorepo/ui/lib/utils"

// Locales
import { defaultMessages } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import type { LinkComponent } from "../auth/auth-link"
import { useArrangeItem } from "../design/design-arrange"
import { StorefrontProductCard } from "../storefront/storefront-product-card"
import type { ProductOrderItem } from "./product-order-row"

export interface ProductOrderPosterProps {
  item: ProductOrderItem
  locale: string
  /** Inert, from the screen: on this board a card is something to pick up, not a way to its page. */
  linkComponent: LinkComponent
  disabled?: boolean
  messages?: UiMessages
}

/**
 * One product as the shop window draws it, to be picked up.
 *
 * Two ways to hold it. A mouse grabs the card anywhere. A finger on the card scrolls the page, because
 * a grid of cards fills a phone and would otherwise leave nowhere to scroll from, so a finger and the
 * keyboard use the grip, which is the only part that refuses to scroll. Grip and card are siblings:
 * nested, one press would start the drag twice.
 */
export function ProductOrderPoster({ item, locale, linkComponent, disabled = false, messages = defaultMessages }: ProductOrderPosterProps) {
  const text = messages.catalog.products
  const drag = useArrangeItem(item.id)
  const offShelf = item.status === "DRAFT" || item.soldOut

  return (
    <li ref={drag.setNodeRef} style={drag.style} className={cn("relative", drag.isDragging && "z-10 opacity-80 shadow-lg")}>
      <div
        className={cn(
          "h-full select-none [&_img]:pointer-events-none",
          !disabled && "cursor-grab",
          offShelf && "[&_img]:opacity-50",
        )}
        {...(disabled ? {} : drag.pointerProps)}
      >
        <StorefrontProductCard
          product={{
            id: item.id,
            slug: item.slug,
            name: item.name,
            priceCents: item.priceCents,
            compareAtPriceCents: item.compareAtPriceCents,
            imageUrl: item.imageUrl,
          }}
          href=""
          locale={locale}
          linkComponent={linkComponent}
          messages={messages}
          action={
            item.status === "DRAFT" ? (
              <Badge variant="outline">{text.statusDraft}</Badge>
            ) : item.soldOut ? (
              <Badge variant="outline" className="border-destructive/40 text-destructive">
                {text.statusSoldOut}
              </Badge>
            ) : undefined
          }
        />
      </div>

      {/* The right corner: the card keeps its left one for the discount. Always drawn, since a finger has no hover. */}
      <button
        type="button"
        aria-label={`${messages.design.dragHandle}: ${item.name}`}
        disabled={disabled}
        className="bg-background/90 text-foreground absolute top-2 right-2 z-20 flex size-9 cursor-grab touch-none items-center justify-center rounded-full shadow-sm backdrop-blur disabled:cursor-default disabled:opacity-50"
        {...(disabled ? {} : drag.handleProps)}
      >
        <GripVerticalIcon aria-hidden="true" className="size-4" />
      </button>
    </li>
  )
}
