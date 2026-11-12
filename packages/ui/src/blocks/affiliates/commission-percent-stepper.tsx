"use client"

// Icons
import { MinusIcon, PlusIcon } from "lucide-react"

// UI
import { Button } from "@harness-monorepo/ui/components/button"
import { cn } from "@harness-monorepo/ui/lib/utils"

export interface CommissionPercentStepperProps {
  value: number
  onChange: (percent: number) => void
  /** What the number is the rate of, read with it: "Comissão de Whey". */
  label: string
  decreaseLabel: string
  increaseLabel: string
  size?: "sm" | "lg"
  disabled?: boolean
}

const clamp = (n: number): number => Math.max(0, Math.min(100, Number.isFinite(n) ? Math.round(n) : 0))

/** A whole percent from 0 to 100 — the API's range — typed, or nudged a point at a time. */
export function CommissionPercentStepper({ value, onChange, label, decreaseLabel, increaseLabel, size = "sm", disabled = false }: CommissionPercentStepperProps) {
  const big = size === "lg"
  return (
    <div className="flex items-center gap-1.5">
      <Button type="button" variant="outline" size={big ? "icon-lg" : "icon-sm"} aria-label={decreaseLabel} disabled={disabled || value <= 0} onClick={() => onChange(clamp(value - 1))}>
        <MinusIcon aria-hidden="true" />
      </Button>
      <label className={cn("border-input bg-background flex items-baseline rounded-md border px-2 tabular-nums focus-within:ring-ring/50 focus-within:ring-[3px]", big ? "h-14 px-3" : "h-8")}>
        <span className="sr-only">{label}</span>
        <input
          inputMode="numeric"
          className={cn("w-full bg-transparent text-right outline-none", big ? "w-16 text-3xl font-semibold" : "w-9 text-sm")}
          value={String(value)}
          disabled={disabled}
          onChange={(event) => onChange(clamp(Number(event.target.value.replace(/\D/g, "") || 0)))}
        />
        <span className={cn("text-muted-foreground", big ? "text-xl" : "text-sm")}>%</span>
      </label>
      <Button type="button" variant="outline" size={big ? "icon-lg" : "icon-sm"} aria-label={increaseLabel} disabled={disabled || value >= 100} onClick={() => onChange(clamp(value + 1))}>
        <PlusIcon aria-hidden="true" />
      </Button>
    </div>
  )
}
