"use client"

// React
import { useState } from "react"

// Libs
import { MinusIcon, PlusIcon } from "lucide-react"

// UI
import { Button } from "@harness-monorepo/ui/components/button"
import { Input } from "@harness-monorepo/ui/components/input"

// Locales
import { defaultMessages, format } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"
import { ORDER_QUANTITY_MAX } from "@harness-monorepo/ui/lib/order-form"

export interface OrderQuantityInputProps {
  /** What the line is called, for the field's and the buttons' names. */
  name: string
  value: number
  onChange: (quantity: number) => void
  messages?: UiMessages
}

function clamp(quantity: number): number {
  return Math.min(Math.max(quantity, 1), ORDER_QUANTITY_MAX)
}

/**
 * How many of one line. The box holds what is being typed — empty included — so clearing a 2 to type
 * a 5 gives 5, not 15; the number is settled on leaving the box or pressing Enter.
 */
export function OrderQuantityInput({ name, value, onChange, messages = defaultMessages }: OrderQuantityInputProps) {
  const text = messages.orders.form
  const [typed, setTyped] = useState<string | null>(null)

  function settle() {
    if (typed === null) return
    const parsed = Number.parseInt(typed, 10)
    onChange(Number.isFinite(parsed) ? clamp(parsed) : value)
    setTyped(null)
  }

  return (
    <span className="flex items-center gap-1">
      <Button
        type="button"
        variant="outline"
        size="icon"
        aria-label={format(text.decrease, { name })}
        // The field takes the arrow keys; the buttons are for a thumb, not another tab stop.
        tabIndex={-1}
        disabled={value <= 1}
        onClick={() => onChange(value - 1)}
      >
        <MinusIcon />
      </Button>
      <Input
        type="number"
        inputMode="numeric"
        min={1}
        max={ORDER_QUANTITY_MAX}
        aria-label={format(text.quantity, { name })}
        value={typed ?? value}
        onChange={(event) => {
          const next = event.target.value
          setTyped(next)
          const parsed = Number.parseInt(next, 10)
          // A whole number in range is the line's at once, so the summary follows the typing.
          if (Number.isFinite(parsed) && parsed >= 1 && parsed <= ORDER_QUANTITY_MAX) onChange(parsed)
        }}
        onBlur={settle}
        onKeyDown={(event) => {
          if (event.key !== "Enter") return
          event.preventDefault()
          settle()
        }}
        className="w-16 text-center tabular-nums"
      />
      <Button
        type="button"
        variant="outline"
        size="icon"
        aria-label={format(text.increase, { name })}
        tabIndex={-1}
        disabled={value >= ORDER_QUANTITY_MAX}
        onClick={() => onChange(value + 1)}
      >
        <PlusIcon />
      </Button>
    </span>
  )
}
