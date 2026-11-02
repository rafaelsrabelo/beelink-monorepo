"use client"

// Libs
import { ArrowDownIcon, ArrowUpIcon, ArrowUpToLineIcon, GripVerticalIcon } from "lucide-react"

// UI
import { Badge } from "@harness-monorepo/ui/components/badge"
import { Button } from "@harness-monorepo/ui/components/button"
import { cn } from "@harness-monorepo/ui/lib/utils"

// Locales
import { defaultMessages, format } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import { useArrangeItem } from "../design/design-arrange"
import { ProductNameCell } from "./product-name-cell"

export interface ProductOrderItem {
  id: string
  name: string
  /** The shop window's card needs its slug and prices; the list row draws neither. */
  slug: string
  priceCents: number
  compareAtPriceCents: number | null
  imageUrl: string | null
  status: "ACTIVE" | "DRAFT"
  /** Derived by the API, as on the list: the same fact decides whether the shop window shows it. */
  soldOut: boolean
}

export interface ProductOrderRowProps {
  item: ProductOrderItem
  /** Each absent where the row cannot go that way: the first cannot rise, the last cannot sink. */
  onTop?: (() => void) | undefined
  onUp?: (() => void) | undefined
  onDown?: (() => void) | undefined
  disabled?: boolean
  messages?: UiMessages
}

/**
 * One product in the order of the shop window: what it is, whether a visitor can see it, and three
 * ways to move it. The arrows are not a fallback for the drag. From the end of a long list to the
 * top is a drag of three hundred rows, and it is the move a shopkeeper makes most.
 */
export function ProductOrderRow({ item, onTop, onUp, onDown, disabled = false, messages = defaultMessages }: ProductOrderRowProps) {
  const text = messages.catalog.products
  const drag = useArrangeItem(item.id)
  const named = (template: string) => format(template, { name: item.name })

  const moves = [
    { label: named(text.order.moveTop), Icon: ArrowUpToLineIcon, run: onTop },
    { label: named(text.order.moveUp), Icon: ArrowUpIcon, run: onUp },
    { label: named(text.order.moveDown), Icon: ArrowDownIcon, run: onDown },
  ]

  return (
    <li
      ref={drag.setNodeRef}
      style={drag.style}
      className={cn(
        "bg-shell-surface border-shell-border flex items-center gap-2 rounded-xl border p-2",
        drag.isDragging && "relative z-10 opacity-80 shadow-md",
      )}
    >
      {/* `touch-none` is what lets a finger drag here rather than scroll the page. */}
      <button
        type="button"
        aria-label={`${messages.design.dragHandle}: ${item.name}`}
        disabled={disabled}
        className="text-muted-foreground hover:text-foreground cursor-grab touch-none rounded-md p-1 disabled:cursor-default disabled:opacity-50"
        {...(disabled ? {} : drag.handleProps)}
      >
        <GripVerticalIcon aria-hidden="true" className="size-4" />
      </button>

      <div className="flex min-w-0 flex-1 flex-col items-start gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
        <div className="w-full min-w-0 text-sm sm:w-auto sm:flex-1">
          <ProductNameCell name={item.name} imageUrl={item.imageUrl} messages={messages} />
        </div>
        {item.status === "DRAFT" ? (
          <Badge variant="outline">{text.statusDraft}</Badge>
        ) : item.soldOut ? (
          <Badge variant="outline" className="border-destructive/40 text-destructive">
            {text.statusSoldOut}
          </Badge>
        ) : null}
      </div>

      <div className="flex shrink-0 items-center">
        {moves.map(({ label, Icon, run }) => (
          <Button key={label} type="button" variant="ghost" size="icon" aria-label={label} title={label} disabled={disabled || !run} onClick={run}>
            <Icon aria-hidden="true" className="size-4" />
          </Button>
        ))}
      </div>
    </li>
  )
}
