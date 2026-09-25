"use client"

// Libs
import { PlusIcon } from "lucide-react"

// UI
import { Button } from "@harness-monorepo/ui/components/button"

// Locales
import { defaultMessages } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

export type VariationPreset = "size" | "color" | "weight" | "flavour" | "other"

export interface VariationPresetsProps {
  /** Names of the options the product already has, so a preset in use is not offered twice. */
  taken: readonly string[]
  /** At the limit of three every preset is off, and the limit sentence says why. */
  full: boolean
  onAdd: (preset: VariationPreset, name: string) => void
  disabled?: boolean
  messages?: UiMessages
}

/**
 * The row of options a shopkeeper most often needs, one press each.
 *
 * Buttons and not a searchable list, as design 4a draws them: there are five, and a list that has
 * to be opened to see five choices is a click spent on nothing. "Outra" adds an option with an
 * empty name for the shopkeeper to write.
 */
export function VariationPresets({ taken, full, onAdd, disabled = false, messages = defaultMessages }: VariationPresetsProps) {
  const text = messages.catalog.variations
  const presets: { preset: VariationPreset; name: string }[] = [
    { preset: "size", name: text.presetSize },
    { preset: "color", name: text.presetColor },
    { preset: "weight", name: text.presetWeight },
    { preset: "flavour", name: text.presetFlavour },
    { preset: "other", name: text.presetOther },
  ]
  const used = new Set(taken.map((name) => name.trim().toLocaleLowerCase()))

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-muted-foreground text-sm">{text.addLabel}</span>
        {presets.map(({ preset, name }) => (
          <Button
            key={preset}
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled || full || (preset !== "other" && used.has(name.toLocaleLowerCase()))}
            onClick={() => onAdd(preset, preset === "other" ? "" : name)}
          >
            <PlusIcon aria-hidden="true" />
            {name}
          </Button>
        ))}
      </div>
      {full ? <p className="text-muted-foreground text-sm">{text.limit}</p> : null}
    </div>
  )
}
