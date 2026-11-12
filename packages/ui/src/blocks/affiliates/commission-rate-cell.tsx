"use client"

// Icons
import { RotateCcwIcon } from "lucide-react"

// UI
import { Button } from "@harness-monorepo/ui/components/button"

// Locales
import { defaultMessages, format } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import { CommissionPercentStepper } from "./commission-percent-stepper"

export interface CommissionRateCellProps {
  name: string
  own: boolean
  percent: number
  inheritLabel: string
  onCustomize: () => void
  onRate: (percent: number) => void
  onReset: () => void
  disabled?: boolean
  messages?: UiMessages
}

/** A row's rate: what it inherits and "Personalizar" — or its own, with −/+ and the way back. */
export function CommissionRateCell({ name, own, percent, inheritLabel, onCustomize, onRate, onReset, disabled = false, messages = defaultMessages }: CommissionRateCellProps) {
  const text = messages.affiliates.wizard.commission
  if (!own) {
    return (
      <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
        <span className="text-muted-foreground text-xs tabular-nums">{inheritLabel}</span>
        <Button type="button" variant="outline" size="sm" disabled={disabled} onClick={onCustomize} aria-label={`${text.customize}: ${name}`}>
          {text.customize}
        </Button>
      </div>
    )
  }
  return (
    <div className="flex shrink-0 items-center gap-1.5">
      <CommissionPercentStepper value={percent} onChange={onRate} label={format(text.rateOf, { name })} decreaseLabel={text.decrease} increaseLabel={text.increase} disabled={disabled} />
      <Button type="button" variant="ghost" size="icon-sm" disabled={disabled} onClick={onReset} aria-label={`${text.reset}: ${name}`}>
        <RotateCcwIcon aria-hidden="true" />
      </Button>
    </div>
  )
}
