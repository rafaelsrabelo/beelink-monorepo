"use client"

// Libs
import type { RowSelectionState } from "@tanstack/react-table"

// UI
import { Button } from "@harness-monorepo/ui/components/button"
import type { VariationCombination, VariationValue } from "@harness-monorepo/ui/lib/variations"

// Locales
import { defaultMessages, format } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

export interface VariationTableHeaderProps {
  combinations: readonly VariationCombination[]
  selection: RowSelectionState
  onSelection: (selection: RowSelectionState) => void
  onBulk: (action: "price" | "stock") => void
  trackStock: boolean
  disabled?: boolean
  messages?: UiMessages
}

/** Each value once, option by option: every weight, then every flavour. */
function valuesOf(combinations: readonly VariationCombination[]): VariationValue[] {
  const seen = new Map<string, VariationValue>()
  const options = combinations[0]?.values.length ?? 0
  for (let option = 0; option < options; option++) {
    for (const combination of combinations) {
      const value = combination.values[option]
      if (value) seen.set(value.key, value)
    }
  }
  return [...seen.values()]
}

/**
 * Above the combinations: how many there are, how many are chosen, the bulk actions — and a way to
 * choose every combination of one value at once. Pricing a whey by weight is "every 900 g at
 * R$ 129,90", and ticking eight flavours one by one to say it is eight chances to miss one.
 */
export function VariationTableHeader({
  combinations,
  selection,
  onSelection,
  onBulk,
  trackStock,
  disabled = false,
  messages = defaultMessages,
}: VariationTableHeaderProps) {
  const text = messages.catalog.variations
  const chosen = combinations.filter((combination) => selection[combination.key]).length

  function chooseValue(value: VariationValue) {
    const keys = combinations
      .filter((combination) => combination.values.some((entry) => entry.key === value.key))
      .map((combination) => combination.key)
    const all = keys.every((key) => selection[key])
    const next: RowSelectionState = { ...selection }
    // Pressed again with all of them chosen, the value lets them go.
    for (const key of keys) {
      if (all) delete next[key]
      else next[key] = true
    }
    onSelection(next)
  }

  return (
    <div className="flex flex-col gap-3 border-b px-4 py-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm">
          <span className="font-medium">{format(text.combinations, { count: String(combinations.length) })}</span>
          <span className="text-muted-foreground">
            {" · "}
            {chosen > 0 ? format(text.selected, { count: String(chosen) }) : text.noneSelected}
          </span>
        </p>
        <div className="flex gap-2">
          {(["price", "stock"] as const).map((action) => (
            <Button
              key={action}
              type="button"
              variant="outline"
              size="sm"
              disabled={disabled || chosen === 0 || (action === "stock" && !trackStock)}
              onClick={() => onBulk(action)}
            >
              {action === "price" ? text.samePrice : text.setStock}
            </Button>
          ))}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2" role="group" aria-label={text.selectByValue}>
        <span className="text-muted-foreground text-sm">{text.selectByValue}</span>
        {valuesOf(combinations).map((value) => (
          <Button
            key={value.key}
            type="button"
            variant="ghost"
            size="sm"
            disabled={disabled}
            aria-label={format(text.selectValue, { name: value.name })}
            onClick={() => chooseValue(value)}
          >
            {value.name}
          </Button>
        ))}
      </div>
    </div>
  )
}
