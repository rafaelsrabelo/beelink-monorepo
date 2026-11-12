"use client"

// UI
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@harness-monorepo/ui/components/select"

// Block
import type { AffiliateOption } from "@harness-monorepo/ui/lib/affiliate-money"

/** Base UI's select holds no empty value: "nobody" travels under this one, and leaves as `""`. */
const NOBODY = "__nobody__"

export interface AffiliatePersonSelectProps {
  id: string
  options: readonly AffiliateOption[]
  /** `""` is nobody. */
  value: string
  onChange: (affiliateId: string) => void
  /** The word for crediting nobody. */
  nobodyLabel: string
  disabled?: boolean
  describedBy?: string
}

/** Which affiliate an order is credited to (IMPULSEIA-107), or nobody. */
export function AffiliatePersonSelect({ id, options, value, onChange, nobodyLabel, disabled = false, describedBy }: AffiliatePersonSelectProps) {
  const nameOf = (selected: string) => (selected === NOBODY ? nobodyLabel : (options.find((option) => option.id === selected)?.name ?? ""))

  return (
    <Select value={value || NOBODY} onValueChange={(next: unknown) => onChange(typeof next === "string" && next !== NOBODY ? next : "")} disabled={disabled}>
      <SelectTrigger id={id} aria-describedby={describedBy} className="w-full">
        {/* Base UI shows the raw value unless told how to read it. */}
        <SelectValue>{(selected: string) => nameOf(selected)}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={NOBODY}>{nobodyLabel}</SelectItem>
        {options.map((option) => (
          <SelectItem key={option.id} value={option.id}>
            {option.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
