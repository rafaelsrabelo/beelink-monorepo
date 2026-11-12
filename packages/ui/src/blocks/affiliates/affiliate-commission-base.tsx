"use client"

// React
import { useId } from "react"

// UI
import { Field, FieldDescription, FieldLabel } from "@harness-monorepo/ui/components/field"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@harness-monorepo/ui/components/select"
import { Slider } from "@harness-monorepo/ui/components/slider"
import { cn } from "@harness-monorepo/ui/lib/utils"

// Locales
import { defaultMessages } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import type { AffiliateStartOption } from "@harness-monorepo/ui/lib/affiliate-wizard"
import { percentLabel } from "@harness-monorepo/ui/lib/affiliate-wizard"
import { CommissionPercentStepper } from "./commission-percent-stepper"

export interface AffiliateCommissionBaseProps {
  starts: readonly AffiliateStartOption[]
  startId: string
  onStart: (tableId: string) => void
  /** Whole percent, 0 to 100. */
  base: number
  onBase: (percent: number) => void
  disabled?: boolean
  messages?: UiMessages
}

const PRESETS = [5, 10, 15, 20] as const

/**
 * Where the commission starts and what everything pays by default (the user's design, 12/11/2026):
 * a shared table to start from — kept as it is when nothing changes — and the base, big, with −/+,
 * a slider and the four quick values.
 */
export function AffiliateCommissionBase({ starts, startId, onStart, base, onBase, disabled = false, messages = defaultMessages }: AffiliateCommissionBaseProps) {
  const text = messages.affiliates.wizard.commission
  const id = useId()

  return (
    <div className="flex flex-col gap-5">
      <Field className="max-w-sm">
        <FieldLabel htmlFor={`${id}-start`}>{text.startFrom}</FieldLabel>
        <Select value={startId} onValueChange={(next: unknown) => typeof next === "string" && onStart(next)} disabled={disabled}>
          <SelectTrigger id={`${id}-start`} aria-describedby={`${id}-start-help`} className="w-full">
            <SelectValue>{(selected: string) => starts.find((option) => option.id === selected)?.label ?? ""}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {starts.map((option) => (
              <SelectItem key={option.id} value={option.id}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <FieldDescription id={`${id}-start-help`}>{text.startFromHelp}</FieldDescription>
      </Field>

      <div className="bg-muted/40 flex flex-col gap-4 rounded-xl border p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-col">
            <span className="font-medium">{text.base}</span>
            <span className="text-muted-foreground text-xs">{text.baseHelp}</span>
          </div>
          <CommissionPercentStepper value={base} onChange={onBase} label={text.base} decreaseLabel={text.decrease} increaseLabel={text.increase} size="lg" disabled={disabled} />
        </div>
        <Slider value={base} min={0} max={100} step={1} disabled={disabled} onValueChange={(next) => onBase(Array.isArray(next) ? (next[0] ?? 0) : Number(next))} getAriaLabel={() => text.sliderLabel} />
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((preset) => (
            <button
              key={preset}
              type="button"
              disabled={disabled}
              aria-pressed={base === preset}
              onClick={() => onBase(preset)}
              className={cn(
                "focus-visible:ring-ring rounded-full border px-3 py-1 text-sm font-medium tabular-nums focus-visible:ring-2 focus-visible:outline-none",
                base === preset ? "bg-primary text-primary-foreground border-primary" : "bg-background hover:bg-muted",
              )}
            >
              {percentLabel(preset)}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
