// Libs
import { MinusIcon, PlusIcon, Trash2Icon } from "lucide-react"

// UI
import { Badge } from "@harness-monorepo/ui/components/badge"
import { Button } from "@harness-monorepo/ui/components/button"
import { Input } from "@harness-monorepo/ui/components/input"

// Locales
import { defaultMessages, format } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import { ORDER_QUANTITY_MAX, type OrderFormLine } from "@harness-monorepo/ui/lib/order-form"

export interface OrderLinesProps {
  lines: readonly OrderFormLine[]
  onQuantityChange: (variantId: string, quantity: number) => void
  onRemove: (variantId: string) => void
  money: (cents: number) => string
  messages?: UiMessages
}

/** Whole units between one and the API's ceiling; anything else typed is read as the nearest. */
function quantityFrom(typed: string): number {
  const parsed = Number.parseInt(typed, 10)
  if (!Number.isFinite(parsed)) return 1
  return Math.min(Math.max(parsed, 1), ORDER_QUANTITY_MAX)
}

/** What the order carries so far: each line's price, how many, and its total — editable to the end. */
export function OrderLines({ lines, onQuantityChange, onRemove, money, messages = defaultMessages }: OrderLinesProps) {
  const text = messages.orders.form

  if (!lines.length) return <p className="text-muted-foreground rounded-lg border border-dashed p-4 text-sm">{text.linesEmpty}</p>

  return (
    <ul className="divide-border flex flex-col divide-y rounded-lg border">
      {lines.map((line) => {
        const name = line.variantLabel ? `${line.productName} (${line.variantLabel})` : line.productName
        return (
          <li key={line.variantId} className="flex flex-wrap items-center gap-3 px-3 py-2">
            <span className="flex min-w-0 flex-1 basis-48 flex-col gap-0.5">
              <span className="text-sm font-medium">{line.productName}</span>
              <span className="text-muted-foreground flex flex-wrap items-center gap-2 text-xs">
                {line.variantLabel ? <span>{line.variantLabel}</span> : null}
                <span className="tabular-nums">{money(line.unitPriceCents)}</span>
                {line.outOfStock ? <Badge variant="destructive">{text.outOfStock}</Badge> : null}
              </span>
            </span>
            <span className="flex items-center gap-1">
              <Button
                type="button"
                variant="outline"
                size="icon"
                aria-label={format(text.decrease, { name })}
                // The field takes the arrow keys; the buttons are for a thumb, not another tab stop.
                tabIndex={-1}
                disabled={line.quantity <= 1}
                onClick={() => onQuantityChange(line.variantId, line.quantity - 1)}
              >
                <MinusIcon />
              </Button>
              <Input
                type="number"
                inputMode="numeric"
                min={1}
                max={ORDER_QUANTITY_MAX}
                aria-label={format(text.quantity, { name })}
                value={line.quantity}
                onChange={(event) => onQuantityChange(line.variantId, quantityFrom(event.target.value))}
                className="w-16 text-center tabular-nums"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                aria-label={format(text.increase, { name })}
                tabIndex={-1}
                disabled={line.quantity >= ORDER_QUANTITY_MAX}
                onClick={() => onQuantityChange(line.variantId, line.quantity + 1)}
              >
                <PlusIcon />
              </Button>
            </span>
            <span className="w-24 text-right text-sm font-medium tabular-nums">{money(line.unitPriceCents * line.quantity)}</span>
            <Button type="button" variant="ghost" size="icon" aria-label={format(text.remove, { name })} onClick={() => onRemove(line.variantId)}>
              <Trash2Icon />
            </Button>
          </li>
        )
      })}
    </ul>
  )
}
