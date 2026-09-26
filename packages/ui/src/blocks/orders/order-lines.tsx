"use client"

// React
import { useRef } from "react"

// Libs
import { Trash2Icon } from "lucide-react"

// UI
import { Badge } from "@harness-monorepo/ui/components/badge"
import { Button } from "@harness-monorepo/ui/components/button"
import { overStock, type OrderFormLine } from "@harness-monorepo/ui/lib/order-form"

// Locales
import { defaultMessages, format } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import { OrderQuantityInput } from "./order-quantity-input"

export interface OrderLinesProps {
  lines: readonly OrderFormLine[]
  onQuantityChange: (variantId: string, quantity: number) => void
  onRemove: (variantId: string) => void
  money: (cents: number) => string
  /** The heading that names the list. */
  labelledBy?: string
  messages?: UiMessages
}

/** What the order carries so far: each line's price, how many, and its total — editable to the end. */
export function OrderLines({ lines, onQuantityChange, onRemove, money, labelledBy, messages = defaultMessages }: OrderLinesProps) {
  const text = messages.orders.form
  const list = useRef<HTMLUListElement>(null)
  const empty = useRef<HTMLParagraphElement>(null)

  /** The removed line's button is gone; focus goes to the next line's, or to the empty list. */
  function remove(variantId: string, index: number) {
    onRemove(variantId)
    requestAnimationFrame(() => {
      const buttons = list.current?.querySelectorAll<HTMLButtonElement>("[data-remove]")
      const next = buttons?.[Math.min(index, buttons.length - 1)]
      ;(next ?? empty.current)?.focus()
    })
  }

  if (!lines.length) {
    return (
      <p ref={empty} tabIndex={-1} className="text-muted-foreground rounded-lg border border-dashed p-4 text-sm outline-none">
        {text.linesEmpty}
      </p>
    )
  }

  return (
    <ul ref={list} aria-labelledby={labelledBy} className="divide-border flex flex-col divide-y rounded-lg border">
      {lines.map((line, index) => {
        const name = line.variantLabel ? `${line.productName} (${line.variantLabel})` : line.productName
        return (
          <li key={line.variantId} className="flex flex-wrap items-center gap-x-3 gap-y-2 px-3 py-2">
            <span className="flex min-w-0 flex-1 basis-48 flex-col gap-0.5">
              <span className="text-sm font-medium">{line.productName}</span>
              <span className="text-muted-foreground flex flex-wrap items-center gap-2 text-xs">
                {line.variantLabel ? <span>{line.variantLabel}</span> : null}
                <span className="tabular-nums">{money(line.unitPriceCents)}</span>
                {overStock(line) ? (
                  <Badge variant="outline" className="border-destructive/40 text-destructive">
                    {line.available === 0 ? text.outOfStock : format(text.onlyLeft, { count: String(line.available) })}
                  </Badge>
                ) : null}
              </span>
            </span>
            <span className="ms-auto flex items-center gap-2">
              <OrderQuantityInput name={name} value={line.quantity} onChange={(quantity) => onQuantityChange(line.variantId, quantity)} messages={messages} />
              <span className="min-w-20 text-right text-sm font-medium tabular-nums">{money(line.unitPriceCents * line.quantity)}</span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                data-remove
                aria-label={format(text.remove, { name })}
                onClick={() => remove(line.variantId, index)}
              >
                <Trash2Icon />
              </Button>
            </span>
          </li>
        )
      })}
    </ul>
  )
}
